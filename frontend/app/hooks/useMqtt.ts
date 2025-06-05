import mqtt, { MqttClient, type IClientOptions, type IPublishPacket, type ISubscriptionGrant } from "mqtt";
import { useCallback, useEffect, useRef, useState } from "react";

type QoS = 0 | 1 | 2;

export interface MqttMessage {
  topic: string;
  message: Buffer; // MQTT.js payload is Buffer, changed from string | Buffer
  packet?: IPublishPacket;
  timestamp: Date;
}

export interface UseMqttProps {
  brokerUrl: string;
  options?: IClientOptions;
  topicHandlers?: Array<{ topic: string; handler: (message: MqttMessage) => void }>;
  onMessage?: (message: MqttMessage) => void;
  autoConnect?: boolean;
}

export interface UseMqttReturn {
  client: MqttClient | null;
  connectionStatus: string;
  error: Error | null;
  publish: (
    topic: string,
    message: string | Buffer, // Keep as string | Buffer for publish flexibility
    options?: { qos?: QoS; retain?: boolean },
  ) => void;
  subscribe: (
    topic: string,
    qos?: QoS, // QoS itself is optional, defaults to 0 in implementation
  ) => Promise<ISubscriptionGrant[] | undefined>;
  unsubscribe: (topic: string) => Promise<void | undefined>;
}

export const useMqtt = ({
  brokerUrl,
  options,
  topicHandlers,
  onMessage,
  autoConnect = true,
}: UseMqttProps): UseMqttReturn => {
  const clientRef = useRef<MqttClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  const [error, setError] = useState<Error | null>(null);

  const onMessageHandlerRef = useRef(onMessage);
  const topicHandlersRef = useRef(topicHandlers);

  useEffect(() => {
    onMessageHandlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    topicHandlersRef.current = topicHandlers;
  }, [topicHandlers]);

  const disconnectClient = useCallback(() => {
    if (clientRef.current) {
      console.log("Disconnecting MQTT client...");
      // Remove all listeners before calling end, to prevent events after explicit disconnect
      clientRef.current.removeAllListeners();
      clientRef.current.end(true, () => {
        console.log("MQTT client disconnected.");
        // clientRef.current = null; // This is set in the connectClient or cleanup effect
        // setConnectionStatus('Disconnected'); // This will be set if it doesn't auto-reconnect or connect to new
      });
      // Setting clientRef.current to null immediately after calling end might be too soon
      // if end() has async operations or if other parts of the code expect it to be non-null
      // until the callback of end() is executed or the component unmounts.
      // For now, we rely on the useEffect cleanup and connectClient to manage clientRef.current state.
      // The main thing is that listeners are off and end() is called.
    }
  }, []);

  const connectClient = useCallback(() => {
    if (!brokerUrl) {
      console.warn("MQTT broker URL is not provided.");
      setConnectionStatus("Disconnected");
      setError(new Error("MQTT broker URL is not provided."));
      if (clientRef.current) {
        // If there was an old client, ensure it's fully cleaned up
        disconnectClient();
        clientRef.current = null;
      }
      return;
    }

    if (clientRef.current && (clientRef.current.connected || clientRef.current.reconnecting)) {
      console.log("MQTT client already connected or reconnecting.");
      return;
    }

    // If clientRef.current exists but is in a disconnected state, ensure it's properly ended before creating a new one.
    if (clientRef.current) {
      console.log("Cleaning up previous MQTT client instance before reconnecting.");
      disconnectClient(); // Ensure old one is told to shut down
      clientRef.current = null; // Nullify ref to ensure new one is created
    }

    console.log(`Attempting to connect to MQTT broker: ${brokerUrl}`);
    setConnectionStatus("Connecting");
    setError(null);

    try {
      const newClient = mqtt.connect(brokerUrl, options);
      clientRef.current = newClient;

      newClient.on("connect", () => {
        console.log("MQTT Client Connected");
        setConnectionStatus("Connected");
        setError(null);
      });

      newClient.on("reconnect", () => {
        console.log("MQTT Client Reconnecting");
        setConnectionStatus("Reconnecting");
      });

      newClient.on("close", () => {
        console.log("MQTT Client Closed");
        // This event signifies the connection is down.
        // If clientRef.current is this newClient, it means it's the active one that closed.
        if (clientRef.current === newClient) {
          setConnectionStatus("Disconnected");
        }
      });

      newClient.on("offline", () => {
        console.log("MQTT Client Offline");
        if (clientRef.current === newClient) {
          setConnectionStatus("Offline");
        }
      });

      newClient.on("error", (err) => {
        console.error("MQTT Client Error:", err);
        setError(err);
        // The client might attempt to reconnect on its own.
        // Setting status to 'Error' reflects the last significant event.
        // If it reconnects, 'connect' or 'reconnect' events will update the status.
        if (clientRef.current === newClient) {
          setConnectionStatus("Error");
        }
        // Optionally, one might choose to call newClient.end() here if errors are critical
        // and no automatic reconnection is desired or possible.
      });

      newClient.on("message", (topic, payloadBuffer, packet) => {
        const mqttMessage: MqttMessage = {
          topic,
          message: payloadBuffer, // payload is a Buffer
          packet,
          timestamp: new Date(),
        };

        if (onMessageHandlerRef.current) {
          onMessageHandlerRef.current(mqttMessage);
        }

        topicHandlersRef.current?.forEach((th) => {
          // This is a simple direct match. For wildcard support (e.g., #, +),
          // a more sophisticated topic matching logic would be needed.
          if (th.topic === topic) {
            th.handler(mqttMessage);
          }
        });
      });
    } catch (err: any) {
      console.error("Failed to initialize MQTT client:", err);
      setError(err);
      setConnectionStatus("Error");
      if (clientRef.current) {
        disconnectClient(); // Clean up if an error occurred during setup
        clientRef.current = null;
      }
    }
  }, [brokerUrl, options, disconnectClient]);

  useEffect(() => {
    if (autoConnect) {
      connectClient();
    } else {
      // If autoConnect is false, ensure any existing client is disconnected.
      disconnectClient();
      clientRef.current = null; // Ensure ref is cleared if not auto-connecting
      setConnectionStatus("Disconnected"); // Explicitly set if not auto-connecting
    }

    return () => {
      // Cleanup on unmount or when dependencies change significantly (autoConnect, connectClient)
      console.log("Cleaning up useMqtt hook...");
      disconnectClient();
      if (clientRef.current) {
        // Ensure ref is cleared on final cleanup
        clientRef.current = null;
      }
    };
  }, [autoConnect, connectClient, disconnectClient]);

  const publish = useCallback(
    (topic: string, message: string | Buffer, pubOptions?: { qos?: QoS; retain?: boolean }) => {
      if (clientRef.current && clientRef.current.connected) {
        clientRef.current.publish(topic, message, pubOptions, (err) => {
          if (err) {
            console.error("MQTT publish error:", err);
            setError(err);
          }
        });
      } else {
        const errMsg = "MQTT client not connected. Cannot publish.";
        console.warn(errMsg);
        setError(new Error(errMsg));
      }
    },
    [], // clientRef is stable
  );

  const subscribe = useCallback(
    // qos defaults to 0 if not provided
    async (topic: string, qos: QoS = 0): Promise<ISubscriptionGrant[] | undefined> => {
      if (clientRef.current && clientRef.current.connected) {
        return new Promise((resolve, reject) => {
          // Pass { qos } as the options object
          clientRef.current!.subscribe(topic, { qos }, (err, granted) => {
            if (err) {
              // Corrected template literal for console.error
              console.error(`MQTT subscribe error to topic ${topic}:`, err);
              setError(err);
              reject(err);
            } else {
              resolve(granted);
            }
          });
        });
      } else {
        const errMsg = "MQTT client not connected. Cannot subscribe.";
        console.warn(errMsg);
        const err = new Error(errMsg);
        setError(err);
        return Promise.reject(err);
      }
    },
    [], // clientRef is stable
  );

  const unsubscribe = useCallback(
    async (topic: string): Promise<void | undefined> => {
      if (clientRef.current && clientRef.current.connected) {
        return new Promise((resolve, reject) => {
          clientRef.current!.unsubscribe(topic, {}, (err) => {
            // Empty options object is fine for unsubscribe
            if (err) {
              // Corrected template literal for console.error
              console.error(`MQTT unsubscribe error from topic ${topic}:`, err);
              setError(err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } else {
        const errMsg = "MQTT client not connected. Cannot unsubscribe.";
        console.warn(errMsg);
        const err = new Error(errMsg);
        setError(err);
        return Promise.reject(err);
      }
    },
    [], // clientRef is stable
  );

  return {
    client: clientRef.current,
    connectionStatus,
    error,
    publish,
    subscribe,
    unsubscribe,
  };
};
