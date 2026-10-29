import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import api from "../src/api";
import { AUTH } from "../src/constants/api";
import { authErrorMessage, saveTokenAndEnterApp } from "../src/lib/authSession";

/**
 * Set a new password using a reset token, then enter the app.
 */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError(null);

    if (!token.trim()) {
      setError("Reset token is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(AUTH.resetPassword, {
        token: token.trim(),
        new_password: password,
      });
      const accessToken = response.data?.access_token as string | undefined;
      if (!accessToken) {
        setError("Password updated but no token was returned.");
        return;
      }
      await saveTokenAndEnterApp(accessToken);
    } catch (err) {
      setError(authErrorMessage(err, "Could not reset password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>English Development</Text>
        <Text style={styles.heading}>Reset password</Text>
        <Text style={styles.subheading}>Choose a new password for your account</Text>

        {!params.token ? (
          <>
            <Text style={styles.label}>Reset token</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Paste reset token"
              placeholderTextColor="#93C5FD"
              autoCapitalize="none"
              editable={!loading}
            />
          </>
        ) : null}

        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor="#93C5FD"
          secureTextEntry
          editable={!loading}
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repeat password"
          placeholderTextColor="#93C5FD"
          secureTextEntry
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Update password</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          <Link href="/" style={styles.link}>
            Back to login
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#EFF6FF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  brand: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#2563EB",
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 16,
  },
  error: { color: "#DC2626", fontSize: 14, marginBottom: 12 },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  footer: { marginTop: 20, textAlign: "center" },
  link: { color: "#2563EB", fontWeight: "700" },
});
