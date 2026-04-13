import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
}

/**
 * DatabaseStack — Deploy once (~10-20 min)
 *
 * Creates the RDS MySQL instance. This is the slowest
 * resource to deploy. Once created, you should never
 * need to destroy it unless tearing everything down.
 */
export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbEndpoint: string;
  public readonly dbSecretArn: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // RDS MySQL 8.0
    // Using t3.micro for dev (free tier eligible)
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
      securityGroups: [props.dbSecurityGroup],
      databaseName: "school_db",
      credentials: rds.Credentials.fromGeneratedSecret("school_admin", {
        secretName: "school-db-credentials",
      }),
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      multiAz: false,
      publiclyAccessible: false,
      // IMPORTANT: For dev, allow easy cleanup
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      backupRetention: cdk.Duration.days(0),
    });

    this.dbEndpoint = this.dbInstance.dbInstanceEndpointAddress;
    this.dbSecretArn = this.dbInstance.secret!.secretArn;

    // Outputs
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
