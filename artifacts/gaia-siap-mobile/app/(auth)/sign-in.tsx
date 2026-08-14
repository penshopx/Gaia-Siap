import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!isLoaded || !email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Sign-in incomplete. Please try again.');
      }
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message =
        err instanceof Error ? err.message : 'Sign-in failed. Check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(colors, insets);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <View style={s.inner}>
        {/* Logo mark */}
        <View style={s.logoWrap}>
          <View style={s.logoOuter}>
            <View style={s.logoInner} />
          </View>
        </View>

        <Text style={s.title}>Gaia SIAP</Text>
        <Text style={s.subtitle}>Sign in to your workspace</Text>

        <View style={s.form}>
          <View style={s.inputWrap}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@company.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={s.inputWrap}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [s.button, pressed && s.buttonPressed, loading && s.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading || !isLoaded}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={s.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom + 20,
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: 28,
    },
    logoOuter: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoInner: {
      width: 28,
      height: 28,
      borderRadius: 4,
      borderWidth: 3,
      borderColor: colors.primaryForeground,
      opacity: 0.9,
    },
    title: {
      fontSize: 26,
      fontWeight: '700' as const,
      color: colors.foreground,
      textAlign: 'center',
      fontFamily: 'PlusJakartaSans_700Bold',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: 'center',
      fontFamily: 'PlusJakartaSans_400Regular',
      marginBottom: 36,
    },
    form: {
      gap: 16,
    },
    inputWrap: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.card,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    error: {
      fontSize: 13,
      color: colors.destructive,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    button: {
      height: 50,
      borderRadius: colors.radius,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.primaryForeground,
      fontFamily: 'PlusJakartaSans_600SemiBold',
    },
  });
}
