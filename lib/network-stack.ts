import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

/**
 * NetworkStack — Deploy once (~3-5 min)
 *
 * Creates the VPC, subnets, and security groups shared
 * by all other stacks. Rarely needs redeployment.
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly servicesSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC with public + private subnets
    // Using 1 NAT Gateway to keep costs low (dev environment)
    this.vpc = new ec2.Vpc(this, "SchoolVpc", {
      vpcName: "school-vpc",
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Security group for RDS
    this.dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: "school-db-sg",
      description: "Allow MySQL access from services",
      allowAllOutbound: false,
    });

    // Security group for services (Fargate, Lambda, etc.)
    this.servicesSecurityGroup = new ec2.SecurityGroup(
      this,
      "ServicesSecurityGroup",
      {
        vpc: this.vpc,
        securityGroupName: "school-services-sg",
        description: "Security group for application services",
        allowAllOutbound: true,
      }
    );

    // Allow services to connect to RDS on port 3306
    this.dbSecurityGroup.addIngressRule(
      this.servicesSecurityGroup,
      ec2.Port.tcp(3306),
      "Allow MySQL from services"
    );

    // Outputs for cross-stack references
    new cdk.CfnOutput(this, "VpcId", { value: this.vpc.vpcId });
  }
}
