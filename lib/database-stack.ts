import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

/**
 * DatabaseStack — Deploy once (~10-20 min)
 *
 * Creates the RDS MySQL instance with its own security group.
 * Allows MySQL access from anything inside the VPC (CIDR-based)
 * to avoid cross-stack security group cycles.
 */
export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbEndpoint: string;
  public readonly dbSecretArn: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // DB security group — allows MySQL from within the VPC
    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: props.vpc,
      securityGroupName: "school-db-sg",
      description: "Allow MySQL access from within VPC",
      allowAllOutbound: false,
    });

    // Allow port 3306 from any resource inside the VPC
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(3306),
      "Allow MySQL from VPC"
    );

    // RDS MySQL 8.0 (t3.micro — free tier eligible)
    this.dbInstance = new rds.DatabaseInstance(this, "SchoolDb", {
      instanceIdentifier: "school-db",
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [dbSecurityGroup],
      databaseName: "school_db",
      credentials: rds.Credentials.fromGeneratedSecret("school_admin", {
        secretName: "school-db-credentials",
      }),
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      multiAz: false,
      publiclyAccessible: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      backupRetention: cdk.Duration.days(0),
    });

    this.dbEndpoint = this.dbInstance.dbInstanceEndpointAddress;
    this.dbSecretArn = this.dbInstance.secret!.secretArn;

    new cdk.CfnOutput(this, "DbEndpoint", {
      value: this.dbEndpoint,
      description: "RDS MySQL endpoint",
    });

    new cdk.CfnOutput(this, "DbSecretArn", {
      value: this.dbSecretArn,
      description: "Secrets Manager ARN for DB credentials",
    });
  }
}
