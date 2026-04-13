# ============================================
# school-infra · Makefile
# ============================================
#
# Deploy order (first time):
#   make deploy-base      → Network + Database (~15-25 min, only once)
#   make deploy-services  → phpMyAdmin + future services (~2-3 min)
#
# Daily workflow:
#   make deploy-services  → Redeploy services only (fast)
#   make destroy-services → Tear down services only (DB stays)
#
# Nuclear option:
#   make destroy-all      → Destroy EVERYTHING
#
# ============================================

CDK = npx cdk

.PHONY: install synth diff deploy-base deploy-services deploy-all \
        destroy-services destroy-all status db-info help

# ── Setup ───────────────────────────────────

install:
	@npm install

bootstrap:
	@$(CDK) bootstrap

synth:
	@$(CDK) synth

diff:
	@$(CDK) diff --all

# ── Deploy (granular) ───────────────────────

deploy-network:
	@echo "Deploying Network stack (~3-5 min)..."
	@$(CDK) deploy SchoolNetwork --require-approval never

deploy-database:
	@echo "Deploying Database stack (~10-20 min, go grab a coffee)..."
	@$(CDK) deploy SchoolDatabase --require-approval never

deploy-services:
	@echo "Deploying Services stack (~2-3 min)..."
	@$(CDK) deploy SchoolServices --require-approval never --exclusively --outputs-file outputs.json
	@echo ""
	@echo "=== Deploy complete ==="
	@cat outputs.json 2>/dev/null | grep -o '"http[^"]*"' || true
	@echo ""

# ── Deploy (grouped) ───────────────────────

deploy-base:
	@echo "Deploying Network + Database (do this only once)..."
	@$(CDK) deploy SchoolNetwork SchoolDatabase --require-approval never

deploy-all:
	@echo "Deploying all stacks..."
	@$(CDK) deploy --all --require-approval never --outputs-file outputs.json
	@echo ""
	@echo "=== Deploy complete ==="
	@cat outputs.json 2>/dev/null || true

# ── Destroy (granular) ─────────────────────

destroy-services:
	@echo "Destroying Services stack (DB and Network stay)..."
	@$(CDK) destroy SchoolServices --force

destroy-database:
	@echo "Destroying Database stack..."
	@$(CDK) destroy SchoolDatabase --force

destroy-network:
	@echo "Destroying Network stack..."
	@$(CDK) destroy SchoolNetwork --force

# ── Destroy (nuclear) ──────────────────────

destroy-all:
	@echo "Destroying ALL stacks..."
	@$(CDK) destroy --all --force
	@echo "Everything destroyed."

# ── Info ────────────────────────────────────

status:
	@echo "=== Stack Status ==="
	@aws cloudformation describe-stacks --query 'Stacks[?starts_with(StackName,`School`)].{Name:StackName,Status:StackStatus}' --output table 2>/dev/null || echo "No stacks found or AWS CLI not configured."

db-info:
	@echo "=== DB Connection Info ==="
	@aws cloudformation describe-stacks --stack-name SchoolDatabase --region us-east-1 \
		--query 'Stacks[0].Outputs' --output table 2>/dev/null || echo "Database stack not deployed."
	@echo ""
	@echo "=== DB Credentials ==="
	@aws secretsmanager get-secret-value --secret-id school-db-credentials --region us-east-1 \
		--query SecretString --output text 2>/dev/null | \
		python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Host: {d[\"host\"]}\nUser: {d[\"username\"]}\nPass: {d[\"password\"]}\nPort: {d[\"port\"]}')" \
		|| echo "Could not retrieve credentials."

outputs:
	@cat outputs.json 2>/dev/null || echo "No outputs yet. Run 'make deploy-services' first."

# ── Help ────────────────────────────────────

help:
	@echo ""
	@echo "school-infra commands:"
	@echo ""
	@echo "  SETUP"
	@echo "  make install            Install npm dependencies"
	@echo "  make bootstrap          Bootstrap CDK (first time per account/region)"
	@echo ""
	@echo "  DEPLOY"
	@echo "  make deploy-base        Network + Database (only once, ~15-25 min)"
	@echo "  make deploy-services    phpMyAdmin + services (fast, ~2-3 min)"
	@echo "  make deploy-all         Deploy everything"
	@echo ""
	@echo "  DESTROY"
	@echo "  make destroy-services   Remove services only (DB stays intact)"
	@echo "  make destroy-all        Remove EVERYTHING"
	@echo ""
	@echo "  INFO"
	@echo "  make status             Show stack status in AWS"
	@echo "  make db-info            Show DB endpoint and credentials"
	@echo "  make diff               Preview changes before deploying"
	@echo ""
