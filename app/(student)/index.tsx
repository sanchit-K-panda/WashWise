import React, { useMemo } from 'react';
import { View, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, Ban, AlertCircle } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Chip, Button, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMachines } from '@/hooks/useMachines';
import { useActiveSession } from '@/hooks/useActiveSession';
import { MachineWithSession } from '@/types';

function formatSyncTime(date: Date | null): string {
  if (!date) return 'recently';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StudentHomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { activeSession } = useActiveSession();
  const {
    machines,
    block,
    availableCount,
    totalCount,
    isLoading,
    isRefetching,
    isError,
    error,
    isOffline,
    lastSyncedAt,
    refetch,
  } = useMachines(profile?.hostel_block_id);

  const blockSubtitle = useMemo(() => {
    if (block?.name) {
      return `${block.name} Laundry Room`;
    }
    return 'Block A Laundry Room';
  }, [block]);

  const headerTitle = useMemo(() => {
    if (isLoading && machines.length === 0) {
      return 'Checking machines…';
    }
    return `${availableCount} of ${totalCount} free`;
  }, [isLoading, machines.length, availableCount, totalCount]);

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.sky[500]}
          colors={[colors.sky[500]]}
        />
      }
      offlineBanner={{
        isOffline,
        lastSyncedAt: formatSyncTime(lastSyncedAt),
      }}
      header={{
        title: headerTitle,
        subtitle: blockSubtitle,
        rightAction: (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={signOut}
            className="w-10 h-10 items-center justify-center -mr-2 rounded-full active:bg-sky-50"
          >
            <LogOut size={18} strokeWidth={1.75} color={colors.ink.muted} />
          </Pressable>
        ),
      }}
    >
      {/* Active wash session restore card */}
      {activeSession && (
        <Pressable
          testID="active-session-banner"
          accessibilityRole="button"
          accessibilityLabel={`Active wash on Machine ${activeSession.machine?.label || ''}. Tap to view timer.`}
          onPress={() => router.push(`/(student)/timer/${activeSession.id}`)}
          className="p-4 mb-4 rounded-md border border-sky-200 bg-sky-50 flex-row items-center justify-between"
        >
          <View className="flex-1 mr-2">
            <Text variant="caption" color="accent" style={{ fontWeight: '600' }}>
              Active wash cycle
            </Text>
            <Text variant="body" color="ink" style={{ marginTop: 2 }}>
              Machine {activeSession.machine?.label || '01'} ·{' '}
              {activeSession.status === 'done' ? 'Done (Pending collection)' : 'Running'}
            </Text>
          </View>
          <Button
            size="sm"
            variant="primary"
            fullWidth={false}
            onPress={() => router.push(`/(student)/timer/${activeSession.id}`)}
          >
            View timer
          </Button>
        </Pressable>
      )}

      {/* Loading Skeleton state */}
      {isLoading && machines.length === 0 && (
        <View testID="loading-skeletons" className="flex-row flex-wrap justify-between gap-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <View
              key={`skeleton-${index}`}
              className="w-[48%] p-3.5 rounded-md border border-hairline bg-surface min-h-[114px] justify-between"
            >
              <View className="flex-row items-center justify-between">
                <Skeleton.Line width={36} />
                <Skeleton.Line width={32} />
              </View>
              <Skeleton.Line width="60%" />
            </View>
          ))}
        </View>
      )}

      {/* Error state */}
      {isError && machines.length === 0 && (
        <View
          testID="error-state"
          className="p-6 rounded-md border border-hairline bg-surface items-center text-center my-6"
        >
          <View className="w-10 h-10 rounded-full bg-status-broken/10 items-center justify-center mb-3">
            <AlertCircle size={20} strokeWidth={1.75} color={colors.status.broken} />
          </View>
          <Text variant="section" color="ink" style={{ textAlign: 'center' }}>
            Unable to load machines
          </Text>
          <Text
            variant="body"
            color="muted"
            style={{ textAlign: 'center', marginTop: 4, marginBottom: 16 }}
          >
            {error?.message || 'Check your connection and try again.'}
          </Text>
          <Button variant="secondary" onPress={() => refetch()}>
            Try again
          </Button>
        </View>
      )}

      {/* Empty state */}
      {!isLoading && !isError && machines.length === 0 && (
        <View className="p-8 rounded-md border border-hairline bg-surface items-center my-6">
          <Text variant="section" color="ink">
            No machines found
          </Text>
          <Text variant="body" color="muted" style={{ marginTop: 4 }}>
            No washing machines are registered in this hostel block.
          </Text>
        </View>
      )}

      {/* Machine 2-column tile grid */}
      {machines.length > 0 && (
        <View testID="machine-grid" className="flex-row flex-wrap justify-between gap-y-3">
          {machines.map((machine: MachineWithSession) => {
            const isAvailable = machine.status === 'available';
            const isBroken = machine.status === 'broken';
            const isInUse = machine.status === 'in_use';
            const isMaintenance = machine.status === 'maintenance';

            const remainingMinutes = machine.timeLeftMinutes ?? 0;
            const progress = machine.progressPercent ?? 0;

            const chipLabel =
              isInUse && remainingMinutes > 0
                ? `${remainingMinutes} min left`
                : isInUse
                  ? 'Finishing soon'
                  : undefined;

            let accessibilityDescription = '';
            if (isAvailable) {
              accessibilityDescription = 'Available. Double tap to start a wash cycle.';
            } else if (isInUse) {
              accessibilityDescription = `In use, ${remainingMinutes > 0 ? `${remainingMinutes} minutes left` : 'finishing soon'}.`;
            } else if (isBroken) {
              accessibilityDescription = `Broken${machine.note ? `, ${machine.note}` : ''}. Out of service.`;
            } else if (isMaintenance) {
              accessibilityDescription = `Under maintenance${machine.note ? `, ${machine.note}` : ''}. Unavailable.`;
            }

            return (
              <Pressable
                key={machine.id}
                disabled={!isAvailable}
                accessibilityRole={isAvailable ? 'button' : 'none'}
                accessibilityLabel={`Machine ${machine.label}, ${machine.capacity_kg} kilograms, ${accessibilityDescription}`}
                accessibilityHint={isAvailable ? 'Configures and starts wash cycle' : undefined}
                onPress={() => router.push(`/(student)/start?machineId=${machine.id}`)}
                className={`w-[48%] p-3.5 rounded-md border bg-surface min-h-[114px] justify-between ${
                  isBroken
                    ? 'opacity-40 border-hairline'
                    : isMaintenance
                      ? 'opacity-70 border-hairline'
                      : isAvailable
                        ? 'border-hairline active:border-sky-200 active:bg-sky-50'
                        : 'border-hairline'
                }`}
              >
                {/* Top row: Machine Mono Number + Capacity/Strike Indicator */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text variant="monoMachineId">{machine.label}</Text>

                  {isBroken ? (
                    <View
                      testID={`broken-indicator-${machine.label}`}
                      className="flex-row items-center gap-1"
                    >
                      <Ban size={14} strokeWidth={2} color={colors.status.broken} />
                      <Text
                        variant="caption"
                        style={{
                          color: colors.status.broken,
                          fontFamily: 'PlusJakartaSans_600SemiBold',
                        }}
                      >
                        Broken
                      </Text>
                    </View>
                  ) : (
                    <Text variant="caption" color="muted">
                      {machine.capacity_kg}kg
                    </Text>
                  )}
                </View>

                {/* Status Chip (Color + Icon + Label) */}
                <View className="self-start">
                  <Chip variant={machine.status} label={chipLabel} />
                </View>

                {/* Time-left progress bar if in use */}
                {isInUse && (
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: progress }}
                    accessibilityLabel={`${remainingMinutes} minutes remaining`}
                    className="mt-3 w-full bg-hairline h-1.5 rounded-full overflow-hidden"
                  >
                    <View
                      className="bg-sky-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
