import { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import {
  Mail,
  Lock,
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

type RoleTab = 'student' | 'caretaker';
type StudentMode = 'signin' | 'register';

export default function LoginScreen() {
  const { signInWithPassword, signUpWithPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<RoleTab>('student');
  const [studentMode, setStudentMode] = useState<StudentMode>('signin');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Caretaker form fields
  const [caretakerUsername, setCaretakerUsername] = useState('username_1');
  const [caretakerPassword, setCaretakerPassword] = useState('caretaker123');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleStudentSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    if (studentMode === 'register') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setErrorMessage('Please enter your full name');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await signUpWithPassword(trimmedName, trimmedEmail, trimmedPassword);
        if (!result.success) {
          setErrorMessage(result.error || 'Registration failed. Please try again.');
        } else {
          setSuccessMessage('Account created successfully!');
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(true);
      try {
        const result = await signInWithPassword(trimmedEmail, trimmedPassword);
        if (!result.success) {
          setErrorMessage(result.error || 'Invalid email or password. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCaretakerSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUsername = caretakerUsername.trim();
    const trimmedPass = caretakerPassword.trim();

    if (!trimmedUsername) {
      setErrorMessage('Please enter caretaker username');
      return;
    }

    if (!trimmedPass) {
      setErrorMessage('Please enter caretaker password');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInWithPassword(trimmedUsername, trimmedPass);
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid caretaker credentials');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCaretakerDemo = () => {
    setCaretakerUsername('username_1');
    setCaretakerPassword('caretaker123');
    setErrorMessage(null);
  };

  return (
    <Screen
      header={{
        title:
          activeTab === 'student'
            ? studentMode === 'signin'
              ? 'Sign in'
              : 'Register'
            : 'Caretaker Portal',
        subtitle:
          activeTab === 'student'
            ? studentMode === 'signin'
              ? 'Enter your email and password to access hostel laundry.'
              : 'Create an account with your name, email, and password.'
            : 'Hostel machine maintenance and verification access.',
      }}
      stickyFooter={
        <View className="space-y-3 gap-2">
          {activeTab === 'student' ? (
            <>
              <Button
                loading={isSubmitting}
                onPress={handleStudentSubmit}
                accessibilityLabel={studentMode === 'signin' ? 'Sign in' : 'Create account'}
                rightIcon={<ArrowRight size={18} strokeWidth={1.75} color="#FFFFFF" />}
              >
                {studentMode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  studentMode === 'signin' ? 'Switch to registration' : 'Switch to sign in'
                }
                onPress={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setStudentMode(studentMode === 'signin' ? 'register' : 'signin');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="py-2 items-center justify-center min-h-[44px]"
              >
                <Text variant="caption" color="muted">
                  {studentMode === 'signin'
                    ? "Don't have an account? Register"
                    : 'Already have an account? Sign in'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Button
              loading={isSubmitting}
              onPress={handleCaretakerSubmit}
              accessibilityLabel="Sign in as Caretaker"
              rightIcon={<ArrowRight size={18} strokeWidth={1.75} color="#FFFFFF" />}
            >
              Sign in as Caretaker
            </Button>
          )}
        </View>
      }
    >
      {/* Role Selection Tabs (Anti-slop, clean tabs) */}
      <View className="flex-row bg-surface p-1 rounded-input border border-hairline mb-5">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'student' }}
          accessibilityLabel="Student role tab"
          onPress={() => {
            setActiveTab('student');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 py-2.5 items-center justify-center rounded-md ${
            activeTab === 'student' ? 'bg-bg border border-hairline' : ''
          }`}
        >
          <Text
            variant="caption"
            color={activeTab === 'student' ? 'ink' : 'muted'}
            style={{ fontWeight: activeTab === 'student' ? '600' : '400' }}
          >
            Student
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'caretaker' }}
          accessibilityLabel="Caretaker role tab"
          onPress={() => {
            setActiveTab('caretaker');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 py-2.5 items-center justify-center rounded-md ${
            activeTab === 'caretaker' ? 'bg-bg border border-hairline' : ''
          }`}
        >
          <Text
            variant="caption"
            color={activeTab === 'caretaker' ? 'ink' : 'muted'}
            style={{ fontWeight: activeTab === 'caretaker' ? '600' : '400' }}
          >
            Caretaker
          </Text>
        </Pressable>
      </View>

      {/* Error Alert */}
      {errorMessage && (
        <View
          accessibilityRole="alert"
          accessibilityLabel={errorMessage}
          className="flex-row items-center gap-2.5 p-3.5 bg-surface border border-status-broken rounded-md mb-4"
        >
          <AlertCircle size={18} strokeWidth={1.75} color={colors.status.broken} />
          <Text variant="caption" color="broken" style={{ flex: 1 }}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Success Alert */}
      {successMessage && (
        <View
          accessibilityRole="alert"
          accessibilityLabel={successMessage}
          className="flex-row items-center gap-2.5 p-3.5 bg-surface border border-status-available rounded-md mb-4"
        >
          <CheckCircle2 size={18} strokeWidth={1.75} color={colors.status.available} />
          <Text variant="caption" color="available" style={{ flex: 1 }}>
            {successMessage}
          </Text>
        </View>
      )}

      {activeTab === 'student' ? (
        <View className="space-y-4 gap-4 mt-1">
          {studentMode === 'register' && (
            <View>
              <Text variant="caption" style={{ marginBottom: 6 }}>
                Full Name
              </Text>
              <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
                <User size={18} strokeWidth={1.75} color={colors.ink.muted} />
                <TextInput
                  testID="name-input"
                  accessibilityLabel="Full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={colors.ink.muted}
                  className="flex-1 font-sans text-ink text-[15px] ml-2"
                  editable={!isSubmitting}
                />
              </View>
            </View>
          )}

          <View>
            <Text variant="caption" style={{ marginBottom: 6 }}>
              Email address
            </Text>
            <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
              <Mail size={18} strokeWidth={1.75} color={colors.ink.muted} />
              <TextInput
                testID="email-input"
                accessibilityLabel="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="name@example.com"
                placeholderTextColor={colors.ink.muted}
                className="flex-1 font-sans text-ink text-[15px] ml-2"
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View>
            <Text variant="caption" style={{ marginBottom: 6 }}>
              Password
            </Text>
            <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
              <Lock size={18} strokeWidth={1.75} color={colors.ink.muted} />
              <TextInput
                testID="password-input"
                accessibilityLabel="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.ink.muted}
                className="flex-1 font-sans text-ink text-[15px] ml-2"
                editable={!isSubmitting}
                onSubmitEditing={handleStudentSubmit}
              />
            </View>
            <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
              Must be at least 6 characters.
            </Text>
          </View>
        </View>
      ) : (
        <View className="space-y-4 gap-4 mt-1">
          {/* Caretaker Info Card */}
          <View className="p-3.5 bg-surface border border-hairline rounded-input">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-1.5">
                <Shield size={16} strokeWidth={1.75} color={colors.sky[700]} />
                <Text variant="caption" color="ink" style={{ fontWeight: '600' }}>
                  Caretaker Credentials
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Autofill caretaker credentials"
                onPress={fillCaretakerDemo}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text variant="caption" color="accent" style={{ fontWeight: '600' }}>
                  Autofill
                </Text>
              </Pressable>
            </View>
            <Text variant="caption" color="muted">
              Username:{' '}
              <Text variant="caption" color="ink" style={{ fontWeight: '600' }}>
                username_1
              </Text>
              {'\n'}Password:{' '}
              <Text variant="caption" color="ink" style={{ fontWeight: '600' }}>
                caretaker123
              </Text>
            </Text>
          </View>

          <View>
            <Text variant="caption" style={{ marginBottom: 6 }}>
              Caretaker Username
            </Text>
            <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
              <User size={18} strokeWidth={1.75} color={colors.ink.muted} />
              <TextInput
                testID="caretaker-username-input"
                accessibilityLabel="Caretaker Username"
                value={caretakerUsername}
                onChangeText={setCaretakerUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="username_1"
                placeholderTextColor={colors.ink.muted}
                className="flex-1 font-sans text-ink text-[15px] ml-2"
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View>
            <Text variant="caption" style={{ marginBottom: 6 }}>
              Password
            </Text>
            <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
              <Lock size={18} strokeWidth={1.75} color={colors.ink.muted} />
              <TextInput
                testID="caretaker-password-input"
                accessibilityLabel="Caretaker Password"
                value={caretakerPassword}
                onChangeText={setCaretakerPassword}
                secureTextEntry
                placeholder="caretaker123"
                placeholderTextColor={colors.ink.muted}
                className="flex-1 font-sans text-ink text-[15px] ml-2"
                editable={!isSubmitting}
                onSubmitEditing={handleCaretakerSubmit}
              />
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}
