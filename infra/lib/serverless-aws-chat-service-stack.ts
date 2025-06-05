import path from "node:path";

import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { FeaturePlan, UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CfnAuthorizer, CfnDomainConfiguration, CfnTopicRule } from "aws-cdk-lib/aws-iot";

import { NodeLambda } from "./node-lambda";

export class ServerlessAwsChatServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      featurePlan: FeaturePlan.LITE,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
    });

    new UserPoolClient(this, "UserPoolClient", {
      userPool,
    });

    const authorizerPath = path.join(__dirname, "src", "authorizer.ts");
    const authorizer = new NodeLambda(this, "AuthorizerLambda", {
      entry: authorizerPath,
      description: cdk.FileSystem.fingerprint(authorizerPath),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        AWS_ACCOUNT_ID: this.account,
      },
    });
    authorizer.grantInvoke(new ServicePrincipal("iot.amazonaws.com"));

    const customAuthorizer = new CfnAuthorizer(this, "CustomAuthorizer", {
      authorizerFunctionArn: authorizer.functionArn,
      status: "ACTIVE",
      signingDisabled: true,
    });

    // const ruleActionPath = path.join(__dirname, "src", "chat.ts");
    // const actionLambda = new NodeLambda(this, "ChatLambda", {
    //   entry: ruleActionPath,
    //   description: cdk.FileSystem.fingerprint(ruleActionPath),
    // });
    // actionLambda.grantInvoke(new ServicePrincipal("iot.amazonaws.com"));

    // new CfnTopicRule(this, "ChatRule", {
    //   topicRulePayload: {
    //     sql: "SELECT * FROM 'chat/#'",
    //     actions: [
    //       {
    //         lambda: {
    //           functionArn: actionLambda.functionArn,
    //         },
    //       },
    //     ],
    //   },
    // });

    new CfnDomainConfiguration(this, "DomainConfiguration", {
      domainName: "chat.cloud.avikus.ai",
      serverCertificateArns: [
        "arn:aws:acm:ap-northeast-2:479435310497:certificate/adc4a429-e28b-4e8c-b30f-e5d15b3ff03b",
      ],
      authenticationType: "CUSTOM_AUTH",
      applicationProtocol: "MQTT_WSS",
      authorizerConfig: {
        defaultAuthorizerName: customAuthorizer.ref,
        allowAuthorizerOverride: false,
      },
      domainConfigurationStatus: "ENABLED",
    });
  }
}
