import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface ServicesStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbEndpoint: string;
  dbSecretArn: string;
}

/**
 * ServicesStack — Fast to deploy (~2-3 min)
 *
 * This is the stack you'll iterate on frequently.
 * Contains phpMyAdmin, and later ECS services for
 * the PHP frontend and any other services.
 *
 * Safe to destroy and recreate without affecting
 * the network or database.
 */
export class ServicesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ServicesStackProps) {
    super(scope, id, props);

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "SchoolCluster", {
      clusterName: "school-cluster",
      vpc: props.vpc,
    });

    // DB credentials from Secrets Manager
    const dbSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "DbSecret",
      props.dbSecretArn
    );

    // ── phpMyAdmin on Fargate ──────────────────
    const phpMyAdmin = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "PhpMyAdmin",
      {
        cluster,
        serviceName: "phpmyadmin",
        desiredCount: 1,
        cpu: 256,
        memoryLimitMiB: 512,
        assignPublicIp: false,
        taskSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry("phpmyadmin:5"),
          containerPort: 80,
          environment: {
            PMA_HOST: props.dbEndpoint,
            PMA_PORT: "3306",
          },
          secrets: {
            PMA_USER: ecs.Secret.fromSecretsManager(dbSecret, "username"),
            PMA_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, "password"),
          },
        },
      }
    );

    // Health check
    phpMyAdmin.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200,302",
    });

    // Output the URL
    new cdk.CfnOutput(this, "PhpMyAdminUrl", {
      value: `http://${phpMyAdmin.loadBalancer.loadBalancerDnsName}`,
      description: "phpMyAdmin URL",
    });
  }
}
