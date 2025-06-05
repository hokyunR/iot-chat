import { IoTEvent } from "aws-lambda";

export const handler = async (event: IoTEvent) => {
  console.log(event);
};
