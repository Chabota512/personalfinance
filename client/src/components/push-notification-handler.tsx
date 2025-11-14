
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function PushNotificationHandler() {
  const { toast } = useToast();

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      registerPushNotifications();
    }
  }, []);

  const registerPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Push notifications permission denied");
        return;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          "BE0lkostRkNvXXh7VJSdByXCgZ5xK7Uvp2ZcKbreuoHW7bFjbNMiM1Saki98UDejgcOCwaziKZLrNWqY-CU46Hc"
        ),
      });

      // Send subscription to server
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(subscription.toJSON()),
      });

      console.log("Push notifications enabled");
    } catch (error) {
      console.error("Failed to register push notifications:", error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return null;
}
