# school-infra

AWS CDK infrastructure for the school management system. Split into 3 stacks ordered by deploy time so you never wait for the database again.

## Requirements

- Node.js 18+
- AWS CLI configured (`aws configure`)
- AWS CDK (`npm install -g aws-cdk` or use `npx cdk`)

## Stack Architecture

```
┌─────────────────────────────────────────────────┐
│ SchoolNetwork        (~3-5 min, deploy once)    │
│ VPC, subnets, NAT Gateway, security groups      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│ SchoolDatabase       (~10-20 min, deploy once)  │
│ RDS MySQL 8.0 (t3.micro), Secrets Manager       │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│ SchoolServices       (~2-3 min, iterate fast)   │
│ ECS Fargate cluster, phpMyAdmin, ALB            │
│ (future: PHP frontend, Lambda APIs)             │
└─────────────────────────────────────────────────┘
```

## First Time Setup

```bash
make install          # Install dependencies
make bootstrap        # Bootstrap CDK (once per AWS account/region)
make deploy-base      # Deploy Network + Database (~15-25 min)
make deploy-services  # Deploy phpMyAdmin (~2-3 min)
```

## Daily Workflow

```bash
# Redeploy services after changes (fast)
make deploy-services

# Tear down services to save costs (DB stays intact)
make destroy-services

# Check what's deployed
make status

# Get DB connection info + password
make db-info

# Preview changes before deploying
make diff
```

## Destroy Everything

```bash
make destroy-all      # Removes ALL stacks, no confirmation needed
```

All resources have `removalPolicy: DESTROY` and `deletionProtection: false` so nothing gets stuck. One command, everything gone.

## Available Commands

```
SETUP
  make install            Install npm dependencies
  make bootstrap          Bootstrap CDK (first time per account/region)

DEPLOY
  make deploy-base        Network + Database (only once, ~15-25 min)
  make deploy-services    phpMyAdmin + services (fast, ~2-3 min)
  make deploy-all         Deploy everything

DESTROY
  make destroy-services   Remove services only (DB stays intact)
  make destroy-all        Remove EVERYTHING

INFO
  make status             Show stack status in AWS
  make db-info            Show DB endpoint and credentials
  make diff               Preview changes before deploying
```

## Cost Estimate (dev environment)

- RDS t3.micro: ~$15/month (free tier eligible first 12 months)
- NAT Gateway: ~$32/month (the most expensive part)
- Fargate (phpMyAdmin): ~$9/month
- ALB: ~$16/month
- **Total: ~$72/month** (or ~$15/month if on free tier)

Tip: Use `make destroy-services` when not working to save on Fargate + ALB costs. The DB is the only thing that needs to stay up.
