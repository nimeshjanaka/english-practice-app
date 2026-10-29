import { Link } from "expo-router";
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
import { GoogleSignInButton } from "../src/components/GoogleSignInButton";
import { AUTH } from "../src/constants/api";
import { authErrorMessage, saveTokenAndEnterApp } from "../src/lib/authSession";

/**
 * Login screen — email/password, Google, links to sign up + forgot password.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(AUTH.login, {
        email: email.trim().toLowerCase(),
        password,
      });

      const accessToken = response.data?.access_token as string | undefined;
      if (!accessToken) {
        setError("Login succeeded but no token was returned.");
        return;
      }

      await saveTokenAndEnterApp(accessToken);
    } catch (err) {
      setError(authErrorMessage(err, "Login failed. Check your credentials."));
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
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Sign in to continue practicing</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#93C5FD"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!loading}
        />

        <View style={styles.passwordRow}>
          <Text style={styles.label}>Password</Text>
          <Link href="/forgot-password" style={styles.forgot}>
            Forgot password?
          </Link>
        </View>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#93C5FD"
          secureTextEntry
          textContentType="password"
          editable={!loading}
          onSubmitEditing={handleLogin}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <GoogleSignInButton onError={setError} />

        <Text style={styles.footer}>
          New here?{" "}
          <Link href="/register" style={styles.link}>
            Create an account
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
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
  passwordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 6,
  },
  forgot: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
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
  error: {
    color: "#DC2626",
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
  },
  link: {
    color: "#2563EB",
    fontWeight: "700",
  },
});
