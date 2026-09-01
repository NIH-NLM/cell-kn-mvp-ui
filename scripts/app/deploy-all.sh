#!/bin/bash
# ==============================================================================
# deploy-all.sh - Full Application Deployment
# ==============================================================================
# Deploys backend, frontend, plot assets, and dataset to AWS in sequence.
#
# USAGE:
#   ./scripts/app/deploy-all.sh <environment>
#
# ARGUMENTS:
#   environment    Environment name: dev, sandbox, stage, or prod
#
# WHAT IT DOES:
#   1. Runs app/deploy-backend.sh (builds Docker image, pushes to ECR, updates ECS)
#   2. Runs app/deploy-frontend.sh (builds React app, uploads to S3, invalidates CloudFront)
#   3. Runs app/deploy-assets.sh (copies the release's plot assets into the frontend bucket)
#   4. Runs app/deploy-dataset.sh (loads dataset into the environment's database)
#
# WHY ASSETS COME BEFORE THE DATASET:
#   The dataset's nodes carry plots/<tag>/... URLs. Copying the assets first
#   means nothing references them yet (the live database still returns the old
#   URLs), so when the database swaps, the new URLs are already backed by
#   objects. Reversing the order opens a window of broken plot links.
#   See docs/static-asset-copy-plan.md.
#
# PREREQUISITES:
#   - AWS CLI configured with appropriate credentials
#   - Docker installed and running
#   - Node.js and npm installed
#   - Infrastructure deployed
#
# TYPICAL USE CASES:
#   - First time deployment after infrastructure setup
#   - Deploying coordinated backend and frontend changes
#   - Full application updates
#
# INDIVIDUAL DEPLOYMENTS:
#   For faster deployments when only one component changed:
#     ./scripts/app/deploy-backend.sh <env>   # Backend only
#     ./scripts/app/deploy-frontend.sh <env>  # Frontend only
#     ./scripts/app/deploy-assets.sh <env>    # Plot assets only
#     ./scripts/app/deploy-dataset.sh <env>   # Dataset only
#
# MONITORING:
#   The script shows all application URLs at completion.
#   Watch logs (replace <env> with the deployed environment):
#     aws logs tail /ecs/nlm-ckn-<env>-backend --follow
# ==============================================================================
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ENVIRONMENT=$1
if [ -z "$ENVIRONMENT" ]; then
    echo -e "${RED}Error: environment is required${NC}"
    echo "Usage: $0 <environment>"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Cell-KN Full Deployment to AWS (${ENVIRONMENT})${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Deploy backend
echo -e "${GREEN}Step 1/4: Deploying Backend...${NC}"
if ! "$SCRIPT_DIR/deploy-backend.sh" "$ENVIRONMENT"; then
    echo -e "${RED}Backend deployment failed. Aborting.${NC}"
    exit 1
fi

echo -e "\n${BLUE}----------------------------------------${NC}\n"

# Deploy frontend
echo -e "${GREEN}Step 2/4: Deploying Frontend...${NC}"
if ! "$SCRIPT_DIR/deploy-frontend.sh" "$ENVIRONMENT"; then
    echo -e "${RED}Frontend deployment failed.${NC}"
    exit 1
fi

echo -e "\n${BLUE}----------------------------------------${NC}\n"

# Deploy plot assets (before the dataset — see the header)
echo -e "${GREEN}Step 3/4: Deploying Plot Assets...${NC}"
if [ "$ENVIRONMENT" = "sandbox" ]; then
    # deploy-assets.sh refuses sandbox outright: its ALB->Lambda path cannot
    # serve pre-gzipped objects yet. Skip loudly here rather than letting that
    # guard abort an otherwise healthy sandbox deploy.
    echo -e "${YELLOW}Skipping plot assets for sandbox — its ALB->Lambda path cannot serve"
    echo -e "them yet (see docs/static-asset-copy-plan.md). Everything else proceeds.${NC}"
elif ! "$SCRIPT_DIR/deploy-assets.sh" "$ENVIRONMENT"; then
    echo -e "${RED}Plot asset deployment failed. Aborting before the dataset,${NC}"
    echo -e "${RED}so the database is not swapped to a version whose plots are missing.${NC}"
    exit 1
fi

echo -e "\n${BLUE}----------------------------------------${NC}\n"

# Deploy dataset
echo -e "${GREEN}Step 4/4: Deploying Dataset...${NC}"
if ! "$SCRIPT_DIR/deploy-dataset.sh" "$ENVIRONMENT"; then
    echo -e "${RED}Dataset deployment failed.${NC}"
    exit 1
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Full deployment complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"
