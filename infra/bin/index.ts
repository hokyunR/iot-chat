#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { ServerlessAwsChatServiceStack } from "../lib/serverless-aws-chat-service-stack";

const app = new cdk.App();
new ServerlessAwsChatServiceStack(app, "ServerlessAwsChatServiceStack");
