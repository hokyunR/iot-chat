import mqtt from "mqtt";
import { useEffect, useRef, useState } from "react";

interface Message {
  topic: string;
  message: string;
}

export default function Home() {
  const [brokerUrl, setBrokerUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const clientRef = useRef<mqtt.MqttClient | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const connectToMqtt = () => {
    clientRef.current?.connect();
  };

  useEffect(() => {
    clientRef.current = mqtt.connect(brokerUrl, {
      clientId,
      username,
      password,
      manualConnect: true,
    });

    clientRef.current.on("connect", (packet) => {
      console.log(packet);

      setIsConnected(true);

      clientRef.current?.subscribe("chat/room1", (err) => {
        if (!err) {
          console.log("Successfully subscribed to chat/room1");
        } else {
          console.error("Subscription error:", err);
        }
      });
    });

    clientRef.current.on("message", (topic, message) => {
      console.log("Received message from topic:", topic);
      console.log("Message:", message.toString());
      setMessages((prev) => [...prev, { topic, message: message.toString() }]);
    });

    return () => {
      if (!clientRef.current?.connected) return;

      clientRef.current.end();
    };
  }, [brokerUrl, clientId, username, password]);

  return (
    <div onSubmit={connectToMqtt} className="container">
      <div className="panel">
        <div className="panel-header">
          <h2>Connection</h2>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}></span>
          </div>
        </div>

        <div className="panel-content">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="brokerUrl">Broker URL</label>
              <input
                type="text"
                id="brokerUrl"
                name="brokerUrl"
                value={brokerUrl}
                onChange={(e) => setBrokerUrl(e.target.value)}
                placeholder="mqtt-dashboard.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="clientId">ClientID</label>
              <input
                type="text"
                id="clientId"
                name="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="clientId-it6i2kp68j"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="text"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group connect-group">
              <button onClick={connectToMqtt} className="connect-button" disabled={isConnected}>
                {isConnected ? "Connected" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="panel messages-panel">
          <div className="panel-header">
            <h2>Messages</h2>
          </div>
          <div className="panel-content">
            <div className="messages-list">
              {messages.map((msg, index) => (
                <div key={index} className="message-item">
                  <strong>{msg.topic}:</strong> {msg.message}
                </div>
              ))}
              {messages.length === 0 && <div className="no-messages">No messages received yet</div>}
            </div>
          </div>
        </div>
      )}

      <style>
        {`
        .container {
          font-family: Arial, sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .panel {
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 20px;
          background-color: #f9f9f9;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .panel-header {
          padding: 10px 15px;
          border-bottom: 1px solid #ddd;
          background-color: #f3f3f3;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .panel-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        
        .panel-content {
          padding: 15px;
        }
        
        .form-row {
          margin-bottom: 15px;
          display: flex;
        }
        
        .form-group {
          flex: 1;
          margin-right: 10px;
        }
        
        .form-group:last-child {
          margin-right: 0;
        }
        
        .port-group {
          flex: 0 0 100px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          font-size: 14px;
        }
        
        input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        
        input:disabled {
          background-color: #f5f5f5;
          color: #777;
        }
        
        .connect-button {
          background-color: #4a90e2;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
          margin-top: 10px;
        }
        
        .connect-button:disabled {
          background-color: #a0c8ff;
          cursor: not-allowed;
        }
        
        .messages-panel {
          min-height: 200px;
        }
        
        .messages-list {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .message-item {
          padding: 10px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        
        .no-messages {
          padding: 20px;
          text-align: center;
          color: #777;
          font-style: italic;
        }
        
        .connection-status {
          display: flex;
          align-items: center;
        }
        
        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }
        
        .connected {
          background-color: #4CAF50;
          box-shadow: 0 0 5px #4CAF50;
        }
        
        .disconnected {
          background-color: #F44336;
          box-shadow: 0 0 5px #F44336;
        }
        `}
      </style>
    </div>
  );
}
