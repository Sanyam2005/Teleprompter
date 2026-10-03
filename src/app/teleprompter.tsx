import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getScript } from '@/storage/scripts';
import { colors, radius, spacing } from '@/theme/colors';

const MIN_FONT = 18;
const MAX_FONT = 72;
const MIN_SPEED = 10; // pixels per second
const MAX_SPEED = 240; // pixels per second
const READING_LINE = 0.42; // fraction of viewport height
const MAX_DURATION = 60 * 60; // seconds
const TARGET_BITRATE = 50_000_000; // 50 Mbps — request the highest practical quality

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function TeleprompterScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const script = useMemo(() => (id ? getScript(id) : undefined), [id]);
  const insets = useSafeAreaInsets();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const cameraRef = useRef<CameraView>(null);
  const [isFocused, setIsFocused] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [savedNotice, setSavedNotice] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [fontSize, setFontSize] = useState(34);
  const [speed, setSpeed] = useState(60);
  const [mirror, setMirror] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [viewportHeight, setViewportHeight] = useState(() => Dimensions.get('window').height);
  const [contentHeight, setContentHeight] = useState(0);

  // Reanimated shared values drive the scroll on the UI thread for 60 FPS.
  const translateY = useSharedValue(0);
  const speedSV = useSharedValue(speed);
  const playingSV = useSharedValue(false);
  const maxScroll = useSharedValue(0);

  useEffect(() => {
    speedSV.value = speed;
  }, [speed, speedSV]);

  useEffect(() => {
    maxScroll.value = Math.max(0, contentHeight - viewportHeight);
  }, [contentHeight, viewportHeight, maxScroll]);

  const handleReachEnd = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useFrameCallback((frame) => {
    if (!playingSV.value) return;
    const dt = (frame.timeSincePreviousFrame ?? 16.6) / 1000;
    const limit = -maxScroll.value;
    let next = translateY.value - speedSV.value * dt;
    if (next <= limit) {
      next = limit;
      playingSV.value = false;
      runOnJS(handleReachEnd)();
    }
    translateY.value = next;
  });

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const play = useCallback(() => {
    if (maxScroll.value <= 0) return;
    if (translateY.value <= -maxScroll.value) {
      translateY.value = 0;
    }
    playingSV.value = true;
    setIsPlaying(true);
  }, [maxScroll, playingSV, translateY]);

  const pause = useCallback(() => {
    playingSV.value = false;
    setIsPlaying(false);
  }, [playingSV]);

  const reset = useCallback(() => {
    playingSV.value = false;
    setIsPlaying(false);
    translateY.value = 0;
  }, [playingSV, translateY]);

  const togglePlay = useCallback(() => {
    if (playingSV.value) {
      pause();
    } else {
      play();
    }
  }, [pause, play, playingSV]);

  // Pause scrolling + stop recording when the screen loses focus.
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        playingSV.value = false;
        try {
          cameraRef.current?.stopRecording();
        } catch {
          // no-op
        }
      };
    }, [playingSV]),
  );

  // Recording timer.
  useEffect(() => {
    if (!isRecording) return;
    setElapsed(0);
    const interval = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto-dismiss the "saved" toast.
  useEffect(() => {
    if (!savedNotice) return;
    const timeout = setTimeout(() => setSavedNotice(false), 2600);
    return () => clearTimeout(timeout);
  }, [savedNotice]);

  const saveToGallery = useCallback(
    async (uri: string) => {
      let granted = mediaPermission?.granted ?? false;
      if (!granted) {
        const response = await requestMediaPermission();
        granted = response.granted;
      }
      if (!granted) {
        Alert.alert(
          'Gallery permission needed',
          'Allow photo library access to automatically save your recordings.',
        );
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      setSavedNotice(true);
    },
    [mediaPermission, requestMediaPermission],
  );

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording || !cameraReady) return;
    setIsRecording(true);
    try {
      const options =
        Platform.OS === 'ios'
          ? ({ codec: 'avc1', maxDuration: MAX_DURATION } as const)
          : ({ maxDuration: MAX_DURATION } as const);
      const video = await cameraRef.current.recordAsync(options);
      if (video?.uri) {
        await saveToGallery(video.uri);
      }
    } catch (error) {
      Alert.alert('Recording error', error instanceof Error ? error.message : String(error));
    } finally {
      setIsRecording(false);
    }
  }, [cameraReady, isRecording, saveToGallery]);

  const stopRecording = useCallback(() => {
    cameraRef.current?.stopRecording();
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleExit = useCallback(() => {
    if (isRecording) stopRecording();
    playingSV.value = false;
    router.back();
  }, [isRecording, playingSV, stopRecording]);

  // ---- Conditional UI (after all hooks) ----------------------------------
  if (!script) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={colors.textSecondary} />
        <Text style={styles.centeredText}>This script could not be found.</Text>
        <Pressable onPress={() => router.back()} style={styles.centeredButton}>
          <Text style={styles.centeredButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const permissionsLoading = !cameraPermission || !micPermission;
  const permissionsGranted =
    Platform.OS === 'web' || (cameraPermission?.granted && micPermission?.granted); // TEMP-WEB-DEBUG

  if (permissionsLoading && Platform.OS !== 'web') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.permIcon}>
          <Ionicons name="videocam-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.permTitle}>Camera & microphone access</Text>
        <Text style={styles.permSubtitle}>
          Teleprompter needs your front camera and microphone to record video while you read.
        </Text>
        <Pressable
          onPress={async () => {
            await requestCameraPermission();
            await requestMicPermission();
            await requestMediaPermission();
          }}
          style={({ pressed }) => [styles.permButton, pressed && styles.pressedDim]}
        >
          <Text style={styles.permButtonText}>Grant access</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.permSecondary}>
          <Text style={styles.permSecondaryText}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {Platform.OS !== 'web' && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
          videoQuality="2160p"
          videoBitrate={TARGET_BITRATE}
          mirror={mirror}
          active={isFocused}
          onCameraReady={() => setCameraReady(true)}
        />
      )}

      {/* Readability scrim so light text stays legible over any background. */}
      <View style={styles.scrim} pointerEvents="none" />

      {/* Tap anywhere on the stage to play / pause. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={togglePlay} />

      {/* Scrolling script. */}
      <View
        style={styles.textViewport}
        pointerEvents="none"
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      >
        <Animated.View style={[styles.textTrack, textAnimatedStyle]}>
          <View
            onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}
            style={{
              width: '100%',
              paddingTop: viewportHeight * READING_LINE,
              paddingBottom: viewportHeight * 0.6,
              paddingHorizontal: spacing.xl,
            }}
          >
            <Text style={[styles.scriptText, { fontSize, lineHeight: fontSize * 1.42 }]}>
              {script.content?.trim()
                ? script.content
                : 'This script has no text yet.\nGo back, edit it, and paste your script.'}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Reading line guide. */}
      <View style={[styles.readingLine, { top: `${READING_LINE * 100}%` }]} pointerEvents="none">
        <View style={styles.readingMarker} />
        <View style={styles.readingRule} />
        <View style={styles.readingMarker} />
      </View>

      {/* Top bar. */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityLabel="Close teleprompter"
          hitSlop={10}
          onPress={handleExit}
          style={({ pressed }) => [styles.glassIcon, pressed && styles.pressedDim]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {script.title}
          </Text>
          {isRecording ? (
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>REC {formatDuration(elapsed)}</Text>
            </View>
          ) : (
            <Text style={styles.qualityHint}>4K · highest quality</Text>
          )}
        </View>

        <Pressable
          accessibilityLabel="Mirror camera"
          hitSlop={10}
          onPress={() => setMirror((value) => !value)}
          style={({ pressed }) => [styles.glassIcon, pressed && styles.pressedDim]}
        >
          <Ionicons
            name="camera-reverse-outline"
            size={22}
            color={mirror ? colors.primary : colors.text}
          />
        </Pressable>
      </View>

      {/* Saved toast. */}
      {savedNotice ? (
        <View style={[styles.toast, { top: insets.top + 64 }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.toastText}>Saved to gallery</Text>
        </View>
      ) : null}

      {/* Bottom controls. */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {showSettings ? (
          <View style={styles.settingsPanel}>
            <View style={styles.settingRow}>
              <Ionicons name="text" size={18} color={colors.textSecondary} />
              <Slider
                style={styles.slider}
                minimumValue={MIN_FONT}
                maximumValue={MAX_FONT}
                step={1}
                value={fontSize}
                onValueChange={(value) => setFontSize(Math.round(value))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.text}
              />
              <Text style={styles.settingValue}>{fontSize}px</Text>
            </View>
            <View style={styles.settingRow}>
              <Ionicons name="speedometer-outline" size={18} color={colors.textSecondary} />
              <Slider
                style={styles.slider}
                minimumValue={MIN_SPEED}
                maximumValue={MAX_SPEED}
                step={5}
                value={speed}
                onValueChange={(value) => setSpeed(Math.round(value))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.text}
              />
              <Text style={styles.settingValue}>{speed}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.controlsRow}>
          <ControlButton icon="refresh" label="Reset" onPress={reset} />
          <ControlButton
            icon="options-outline"
            label="Adjust"
            active={showSettings}
            onPress={() => setShowSettings((value) => !value)}
          />

          <Pressable
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            onPress={togglePlay}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressedDim]}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#0A0A0C"
              style={!isPlaying && { marginLeft: 3 }}
            />
          </Pressable>

          <Pressable
            accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
            onPress={toggleRecording}
            disabled={!cameraReady}
            style={({ pressed }) => [
              styles.recordButton,
              !cameraReady && styles.pressedDim,
              pressed && styles.pressedDim,
            ]}
          >
            <View style={isRecording ? styles.recordStop : styles.recordInner} />
          </Pressable>

          <View style={styles.controlSpacer} />
        </View>
      </View>
    </View>
  );
}

interface ControlButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}

function ControlButton({ icon, label, onPress, active = false }: ControlButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.controlButton, pressed && styles.pressedDim]}
    >
      <Ionicons name={icon} size={24} color={active ? colors.primary : colors.text} />
      <Text style={[styles.controlLabel, active && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  centeredText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  centeredButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
  },
  centeredButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  permIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  permTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  permSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  permButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permButtonText: {
    color: '#0A0A0C',
    fontSize: 16,
    fontWeight: '700',
  },
  permSecondary: {
    paddingVertical: spacing.md,
  },
  permSecondaryText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  textViewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  textTrack: {
    width: '100%',
  },
  scriptText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.98)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  readingLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  readingMarker: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(79,140,255,0.7)',
  },
  readingRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  topTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    maxWidth: '90%',
  },
  qualityHint: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.recording,
  },
  recText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  glassIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  toastText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  settingsPanel: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slider: {
    flex: 1,
    height: 36,
  },
  settingValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    width: 44,
    textAlign: 'right',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 56,
  },
  controlLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  controlSpacer: {
    width: 56,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  recordButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.recording,
  },
  recordStop: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: colors.recording,
  },
  pressedDim: {
    opacity: 0.7,
  },
});
