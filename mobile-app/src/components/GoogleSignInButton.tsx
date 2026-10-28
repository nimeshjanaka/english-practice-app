import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getGoogleWebClientId } from "../constants/api";
import { authErrorMessage, loginWithGoogleIdToken } from "../lib/authSession";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onError: (message: string) => void;
};

/**
 * Google Sign-In via Expo AuthSession.
 * Hidden until `extra.googleWebClientId` is set in app.json.
 */
export function GoogleSignInButton({ onError }: Props) {
  const clientId = getGoogleWebClientId().trim();
  const [busy, setBusy] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    clientId
      ? {
          clientId,
          iosClientId: clientId,
          androidClientId: clientId,
          webClientId: clientId,
        }
      : {
          // Hook must run unconditionally; button is hidden when clientId is empty
          clientId: "000000000000-placeholder.apps.googleusercontent.com",
        },
  );

  useEffect(() => {
    if (!clientId || response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (!idToken) {
      onError("Google did not return an ID token.");
      return;
    }

    setBusy(true);
    void loginWithGoogleIdToken(idToken)
      .catch((err) => onError(authErrorMessage(err, "Google sign-in failed.")))
      .finally(() => setBusy(false));
  }, [clientId, response, onError]);

  // Don't show the button until Google is configured (avoids the error message)
  if (!clientId) {
    return null;
  }

  async function onPress() {
    setBusy(true);
    try {
      await promptAsync();
    } catch (err) {
      onError(authErrorMessage(err, "Could not open Google Sign-In."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>OR</Text>
        <View style={styles.line} />
      </View>
      <TouchableOpacity
        style={[styles.button, (!request || busy) && styles.disabled]}
        onPress={onPress}
        disabled={!request || busy}
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator color="#1E3A8A" />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#BFDBFE",
  },
  or: {
    marginHorizontal: 10,
    color: "#64748B",
    fontWeight: "700",
    fontSize: 12,
  },
  button: {
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#1E3A8A",
    fontSize: 16,
    fontWeight: "700",
  },
});
