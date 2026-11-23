import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { WashingMachine, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { signInWithPassword, signUpWithPassword } = useAuth();

  // Mode state matching estimator HTML
  const [isStaff, setIsStaff] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedId = identifier.trim();
    const trimmedPass = password.trim();

    if (!isStaff && isRegister) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setErrorMessage('Please enter your full name');
        return;
      }
      if (!trimmedId || !trimmedId.includes('@') || !trimmedId.includes('.')) {
        setErrorMessage('Please enter a valid email address');
        return;
      }
      if (trimmedPass.length < 6) {
        setErrorMessage('Password must be at least 6 characters');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await signUpWithPassword(trimmedName, trimmedId, trimmedPass);
        if (!result.success) {
          setErrorMessage(result.error || 'Registration failed. Please try again.');
        } else {
          setSuccessMessage('Account created successfully! Signing in…');
          await signInWithPassword(trimmedId, trimmedPass);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Sign in mode (student or staff)
    if (!trimmedId) {
      setErrorMessage(isStaff ? 'Enter your username' : 'Enter your email address');
      return;
    }
    if (!isStaff && (!trimmedId.includes('@') || !trimmedId.includes('.'))) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (trimmedPass.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInWithPassword(trimmedId, trimmedPass);
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isStaff ? 'Staff sign in' : isRegister ? 'Create account' : 'Sign in';
  const subtitle = isStaff
    ? 'For hostel laundry staff. Your account is created by the warden.'
    : 'Check which hostel machines are free and time your wash.';
  const idLabel = isStaff ? 'Username' : 'Email address';
  const idPlaceholder = isStaff ? 'username_1' : 'you@college.edu';
  const submitText = isRegister && !isStaff ? 'Create account' : 'Sign in';

  return (
    <View style={styles.root}>
      {/* Background ambient light blobs matching HTML .b1, .b2, .b3 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand header */}
          <View style={styles.brand}>
            <View style={styles.mark}>
              <WashingMachine size={22} color="#1F6FA8" strokeWidth={1.9} />
            </View>
            <Text style={styles.brandTitle}>WashWise</Text>
          </View>

          {/* Heading */}
          <Text style={styles.h1}>{title}</Text>
          <Text style={styles.cap}>{subtitle}</Text>

          {/* Error Message */}
          {errorMessage && (
            <Text style={styles.err} accessibilityRole="alert">
              {errorMessage}
            </Text>
          )}

          {/* Success Message */}
          {successMessage && (
            <Text style={styles.successText} accessibilityRole="alert">
              {successMessage}
            </Text>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name field (Register only) */}
            {isRegister && !isStaff && (
              <View style={styles.fld} testID="name-field">
                <Text style={styles.fldLabel}>Full name</Text>
                <View style={styles.inp}>
                  <User size={18} color="#4F6A80" />
                  <TextInput
                    testID="name-input"
                    value={name}
                    onChangeText={setName}
                    placeholder="Aarav Mehta"
                    placeholderTextColor="#4F6A80"
                    autoCapitalize="words"
                    style={styles.input}
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            )}

            {/* Identifier (Email or Username) */}
            <View style={styles.fld}>
              <Text style={styles.fldLabel}>{idLabel}</Text>
              <View style={styles.inp}>
                {isStaff ? <User size={18} color="#4F6A80" /> : <Mail size={18} color="#4F6A80" />}
                <TextInput
                  testID={isStaff ? 'username-input' : 'email-input'}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={idPlaceholder}
                  placeholderTextColor="#4F6A80"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={isStaff ? 'default' : 'email-address'}
                  style={styles.input}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fld}>
              <Text style={styles.fldLabel}>Password</Text>
              <View style={styles.inp}>
                <Lock size={18} color="#4F6A80" />
                <TextInput
                  testID="password-input"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#4F6A80"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  editable={!isSubmitting}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#4F6A80" />
                  ) : (
                    <Eye size={18} color="#4F6A80" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              testID="submit-button"
              accessibilityRole="button"
              accessibilityLabel={submitText}
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnActive,
                isSubmitting && { opacity: 0.7 },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>{submitText}</Text>
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
                </>
              )}
            </Pressable>
          </View>

          {/* Student Account Mode Switcher */}
          {!isStaff && (
            <View style={styles.switchRow}>
              <Text style={styles.cap}>
                {isRegister ? 'Already registered? ' : 'New student? '}
              </Text>
              <Pressable
                testID="switch-mode-button"
                accessibilityRole="button"
                accessibilityLabel={isRegister ? 'Switch to sign in' : 'Switch to registration'}
                onPress={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setIsRegister(!isRegister);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.lnk}>{isRegister ? 'Sign in' : 'Create an account'}</Text>
              </Pressable>
            </View>
          )}

          {/* Staff Mode Switcher */}
          <View style={styles.staffRow}>
            <Text style={styles.cap}>{isStaff ? 'Not staff? ' : 'Hostel caretaker? '}</Text>
            <Pressable
              testID="staff-toggle-button"
              accessibilityRole="button"
              accessibilityLabel={isStaff ? 'Switch to student sign in' : 'Switch to staff sign in'}
              onPress={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setIsStaff(!isStaff);
                setIsRegister(false);
                setIdentifier('');
                setPassword('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.lnk}>{isStaff ? 'Student sign in' : 'Staff sign in'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E3F1FB',
    overflow: 'hidden',
    position: 'relative',
  },
  blob1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#7EC4F3',
    top: -70,
    right: -80,
    opacity: 0.85,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(40px)', WebkitFilter: 'blur(40px)' } as any) : {}),
  },
  blob2: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#B3DDF7',
    top: 300,
    left: -100,
    opacity: 0.85,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(40px)', WebkitFilter: 'blur(40px)' } as any) : {}),
  },
  blob3: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#5FAEE8',
    bottom: -100,
    right: -70,
    opacity: 0.7,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(40px)', WebkitFilter: 'blur(40px)' } as any) : {}),
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
      : {}),
  },
  brandTitle: {
    color: '#1F6FA8',
    fontSize: 17,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: -0.4,
    color: '#0B2233',
    marginTop: 34,
  },
  cap: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    marginTop: 4,
    marginBottom: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  form: {
    width: '100%',
  },
  fld: {
    marginBottom: 14,
  },
  fldLabel: {
    fontSize: 13,
    marginBottom: 6,
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  inp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 1,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
      : {}),
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_400Regular',
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  eyeBtn: {
    padding: 8,
  },
  err: {
    fontSize: 12,
    color: '#B83A3A',
    minHeight: 16,
    marginBottom: 6,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  successText: {
    fontSize: 12,
    color: '#12805A',
    minHeight: 16,
    marginBottom: 6,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#2F8BD0',
    marginTop: 4,
    shadowColor: '#2F8BD0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 3,
  },
  btnActive: {
    backgroundColor: '#1F6FA8',
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  lnk: {
    color: '#1F6FA8',
    fontWeight: '500',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 4,
    marginBottom: 18,
  },
});
