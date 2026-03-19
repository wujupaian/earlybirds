import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  if (!Device.isDevice) {
    throw new Error("PUSH_REQUIRES_PHYSICAL_DEVICE");
  }

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    throw new Error("NOTIFICATION_PERMISSION_DENIED");
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  const expoPushToken = projectId
    ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
    : undefined;

  return {
    permissionStatus: finalStatus,
    devicePushToken: typeof deviceToken.data === "string" ? deviceToken.data : JSON.stringify(deviceToken.data),
    expoPushToken,
  };
}

export async function scheduleLocalCheckinReminder() {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Wake up",
      body: "Check-in window opens in 10 minutes.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}

