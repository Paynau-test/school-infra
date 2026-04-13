#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { DatabaseStack } from "../lib/database-stack";
import { ServicesStack } from "../lib/services-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

// Stack 1: Network (deploy once, ~3-5 min)
const network = new NetworkStack(app, "SchoolNetwork", { env });

// Stack 2: Database (deploy once, ~10-20 min)
const database = new DatabaseStack(app, "SchoolDatabase", {
  env,
  vpc: network.vpc,
});

// Stack 3: Services (iterate fast, ~2-3 min)
const services = new ServicesStack(app, "SchoolServices", {
  env,
  vpc: network.vpc,
  dbEndpoint: database.dbEndpoint,
  dbSecretArn: database.dbSecretArn,
});

app.synth();
