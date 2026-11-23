import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Info, Shield, ChevronRight, LogOut } from 'lucide-react-native';
import { colors, typography } from '@/theme/tokens';
import { glassCard, glassPanel, btnSecondary } from '@/theme/glass';
import { Screen, Text, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMachines } from '@/hooks/useMachines';

export function AccountView() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { block } = useMachines(profile?.hostel_block_id);

  const [showSignOutSheet, setShowSignOutSheet] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const displayName =
    profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const blockName = block?.name || 'Block A';
  const isCaretaker = profile?.role === 'caretaker';
  const roleSubtitle = isCaretaker ? `Caretaker · ${blockName}` : 'Student';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleConfirmSignOut = async () => {
    setShowSignOutSheet(false);
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <Screen scrollable>
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>Account</Text>
      </View>

      <Text style={styles.userName}>{displayName}</Text>
      <Text style={styles.roleSub}>{roleSubtitle}</Text>

      {/* Profile Details Card */}
      <View style={styles.card}>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>{isCaretaker ? 'Username' : 'Email'}</Text>
          <Text style={styles.kvValue}>
            {isCaretaker ? user?.email?.split('@')[0] || 'username_1' : user?.email || '—'}
          </Text>
        </View>
        <View style={[styles.kvRow, styles.kvRowLast]}>
          <Text style={styles.kvKey}>Hostel block</Text>
          <Text style={styles.kvValue}>{blockName}</Text>
        </View>
      </View>

      {/* Help Section */}
      <Text style={styles.sectionHeader}>Help</Text>

      <View style={styles.rowsContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How WashWise works"
          onPress={() => setShowHowItWorksModal(true)}
          style={styles.rowItem}
        >
          <Info size={20} strokeWidth={1.75} color={colors.sky[700]} />
          <Text style={styles.rowLabel}>How WashWise works</Text>
          <ChevronRight size={18} strokeWidth={1.75} color={colors.ink.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Contact the caretaker"
          onPress={() => showToast(`Caretaker on duty for ${blockName}`)}
          style={[styles.rowItem, styles.rowItemLast]}
        >
          <Shield size={20} strokeWidth={1.75} color={colors.sky[700]} />
          <Text style={styles.rowLabel}>Contact the caretaker</Text>
          <ChevronRight size={18} strokeWidth={1.75} color={colors.ink.muted} />
        </Pressable>
      </View>

      {/* Sign Out Button */}
      <Button
        variant="secondary"
        onPress={() => setShowSignOutSheet(true)}
        style={styles.signOutButton}
        accessibilityLabel="Sign out"
        leftIcon={<LogOut size={18} strokeWidth={1.75} color={colors.ink.DEFAULT} />}
      >
        Sign out
      </Button>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toast} accessibilityRole="alert">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* How It Works Sheet */}
      <Modal
        visible={showHowItWorksModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHowItWorksModal(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setShowHowItWorksModal(false)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabBar} />
            <Text style={styles.sheetTitle}>How WashWise works</Text>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  Tap any available washing machine in your hostel block.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  Choose your program, water temperature, spin speed, and laundry weight.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>3</Text>
                </View>
                <Text style={styles.stepText}>
                  Start the cycle. You get an exact finish countdown and a timely reminder.
                </Text>
              </View>
            </View>
            <Button
              variant="primary"
              onPress={() => setShowHowItWorksModal(false)}
              style={{ marginTop: 16 }}
            >
              Got it
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sign Out Confirmation Sheet */}
      <Modal
        visible={showSignOutSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutSheet(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setShowSignOutSheet(false)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabBar} />
            <Text style={styles.sheetTitle}>Sign out?</Text>
            <Text style={{ fontSize: 14, color: colors.ink.muted, marginBottom: 16, marginTop: 4 }}>
              Are you sure you want to sign out? You will need to sign back in with your
              credentials.
            </Text>
            <Button
              variant="danger"
              onPress={handleConfirmSignOut}
              accessibilityLabel="Confirm sign out"
              style={{ marginBottom: 10 }}
            >
              Sign out
            </Button>
            <Button
              variant="secondary"
              onPress={() => setShowSignOutSheet(false)}
              accessibilityLabel="Stay signed in"
            >
              Stay signed in
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 28,
    justifyContent: 'center',
    marginBottom: 2,
  },
  topBarText: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
  },
  userName: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: typography.screenTitle.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
    letterSpacing: -0.4,
  },
  roleSub: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    marginBottom: 16,
    marginTop: 2,
  },
  card: {
    ...glassCard,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 20,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 34, 48, 0.07)',
  },
  kvRowLast: {
    borderBottomWidth: 0,
  },
  kvKey: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: colors.ink.muted,
  },
  kvValue: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  sectionHeader: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: typography.section.fontFamily,
    fontWeight: '500',
    marginBottom: 10,
    marginTop: 6,
    color: colors.ink.DEFAULT,
  },
  rowsContainer: {
    ...glassCard,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 34, 48, 0.07)',
    gap: 12,
  },
  rowItemLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  signOutButton: {
    ...btnSecondary,
    minHeight: 50,
    borderRadius: 16,
    marginTop: 8,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.ink.DEFAULT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 40,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 34, 48, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    ...glassPanel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  grabBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 34, 48, 0.18)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 19,
    fontFamily: typography.section.fontFamily,
    fontWeight: '500',
    marginBottom: 6,
    color: colors.ink.DEFAULT,
  },
  stepsList: {
    gap: 12,
    marginVertical: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(47, 139, 208, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.sky[700],
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body.fontFamily,
    color: colors.ink.DEFAULT,
  },
});
