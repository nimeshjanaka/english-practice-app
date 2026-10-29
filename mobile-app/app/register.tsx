import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
 * Sign up — email/password or Google.
 */
export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
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
      const response = await api.post(AUTH.register, {
        email: email.trim().toLowerCase(),
        password,
      });
      const accessToken = response.data?.access_token as string | undefined;
      if (!accessToken) {
        setError("Account created but no token was returned.");
        return;
      }
      await saveTokenAndEnterApp(accessToken);
    } catch (err) {
      setError(authErrorMessage(err, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.brand}>English Development</Text>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.subheading}>Sign up to start your learning path</Text>

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

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor="#93C5FD"
            secureTextEntry
            textContentType="newPassword"
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
            textContentType="newPassword"
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign up</Text>
            )}
          </TouchableOpacity>

          <GoogleSignInButton onError={setError} />

          <Text style={styles.footer}>
            Already have an account?{" "}
            <Link href="/" style={styles.link}>
              Log in
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EFF6FF" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
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
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  footer: {
    marginTop: 20,
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
  },
  link: { color: "#2563EB", fontWeight: "700" },
});
