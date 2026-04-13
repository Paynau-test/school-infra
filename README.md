# school-infra

AWS CDK infrastructure for the school management system. 3 stacks, deploy order matters only the first time.

## Stacks

```
SchoolNetwork    → VPC, subnets, NAT Gateway          (~3-5 min, once)
SchoolDatabase   → RDS MySQL 8.0, Secrets Manager     (~10-20 min, once)
SchoolServices   → ECS Fargate (phpMyAdmin, PHP frontend), ALB  (~2-3 min)
```

## First Time

```bash
make install          # Install dependencies
make bootstrap        # Bootstrap CDK (once per AWS account)
make deploy-base      # Network + Database
make deploy-services  # ECS services
```

## Daily Workflow

```bash
make deploy-services  # Redeploy services (fast, ~2-3 min)
make status           # Check stack status
make db-info          # Show DB endpoint + credentials
make diff             # Preview changes before deploying
```

## Destroy

```bash
make destroy-services   # Remove services only (DB stays)
make destroy-all        # Remove EVERYTHING
```

All resources have `removalPolicy: DESTROY` — one command, everything gone.
