import { CognitoJwtVerifier } from "aws-jwt-verify";
import { IoTCustomAuthorizerEvent, IoTCustomAuthorizerResult } from "aws-lambda";

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID as string,
  tokenUse: null,
  clientId: null,
});
const region = process.env.AWS_REGION as string;
const accountId = process.env.AWS_ACCOUNT_ID as string;

export const handler = async (event: IoTCustomAuthorizerEvent) => {
  const { password: token } = event.protocolData.mqtt || {};

  // const payload = await jwtVerifier.verify(token ?? "");

  // const { sub: userId } = payload;
  // console.log(payload);

  const response: IoTCustomAuthorizerResult = {
    isAuthenticated: true,
    principalId: "Unauthenticated",
    disconnectAfterInSeconds: 3600,
    refreshAfterInSeconds: 3600,
    policyDocuments: [
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["iot:Connect", "iot:Subscribe", "iot:Receive"],
            Resource: [
              `arn:aws:iot:${region}:${accountId}:client/*`,
              `arn:aws:iot:${region}:${accountId}:topicfilter/chat/*`,
              `arn:aws:iot:${region}:${accountId}:topic/chat/*`,
            ],
          },
        ],
      },
    ],
  };

  return response;
};
