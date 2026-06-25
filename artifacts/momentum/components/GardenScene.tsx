import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GARDEN_HEIGHT = 420;
const GROUND_Y = 70;

interface FlowerProps {
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
}

function FlowerElement({ x, y, color, size, delay }: FlowerProps) {
  const scale = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 80 }));
    sway.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(3, { duration: 1800 }),
          withTiming(-3, { duration: 1800 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${sway.value}deg` }],
    transformOrigin: "50% 100%",
  }));

  const petalSize = size * 0.35;
  const petalDist = size * 0.25;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x - size / 2,
          bottom: GROUND_Y + y,
          alignItems: "center",
        },
        animStyle,
      ]}
    >
      <View style={{ width: size, height: size }}>
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const px = Math.cos(rad) * petalDist + size / 2 - petalSize / 2;
          const py = Math.sin(rad) * petalDist + size / 2 - petalSize / 2;
          return (
            <View
              key={angle}
              style={{
                position: "absolute",
                width: petalSize,
                height: petalSize,
                borderRadius: petalSize / 2,
                backgroundColor: color,
                left: px,
                top: py,
                opacity: 0.9,
              }}
            />
          );
        })}
        <View
          style={{
            position: "absolute",
            width: size * 0.36,
            height: size * 0.36,
            borderRadius: size * 0.18,
            backgroundColor: "#FFD86B",
            left: size / 2 - size * 0.18,
            top: size / 2 - size * 0.18,
          }}
        />
      </View>
      <View
        style={{ width: 3, height: 32 + y * 0.3, backgroundColor: "#5A9E5A" }}
      />
    </Animated.View>
  );
}

interface TreeProps {
  x: number;
  y: number;
  size: number;
  delay: number;
  trunkColor: string;
  canopyColor: string;
}

function TreeElement({ x, y, size, delay, trunkColor, canopyColor }: TreeProps) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 60 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const trunkW = size * 0.18;
  const trunkH = size * 0.42;
  const canopyR = size * 0.42;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x - size / 2,
          bottom: GROUND_Y + y,
          alignItems: "center",
        },
        animStyle,
      ]}
    >
      <View
        style={{
          width: canopyR * 2,
          height: canopyR * 2,
          borderRadius: canopyR,
          backgroundColor: canopyColor,
          shadowColor: canopyColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      />
      <View
        style={{
          width: trunkW,
          height: trunkH,
          backgroundColor: trunkColor,
          borderRadius: 4,
        }}
      />
    </Animated.View>
  );
}

interface ButterflyProps {
  x: number;
  y: number;
  color: string;
  delay: number;
}

function ButterflyElement({ x, y, color, delay }: ButterflyProps) {
  const opacity = useSharedValue(0);
  const posX = useSharedValue(0);
  const posY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));
    posX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(18, { duration: 2200 }),
          withTiming(-18, { duration: 2200 }),
        ),
        -1,
        true,
      ),
    );
    posY.value = withDelay(
      delay + 400,
      withRepeat(
        withSequence(
          withTiming(12, { duration: 1600 }),
          withTiming(-12, { duration: 1600 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: posX.value }, { translateY: posY.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: "absolute", left: x, bottom: GROUND_Y + y },
        animStyle,
      ]}
    >
      <MaterialCommunityIcons name="butterfly-outline" size={26} color={color} />
    </Animated.View>
  );
}

interface BirdProps {
  x: number;
  y: number;
  delay: number;
}

function BirdElement({ x, y, delay }: BirdProps) {
  const opacity = useSharedValue(0);
  const posX = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 1000 }));
    posX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(30, { duration: 3000 }),
          withTiming(0, { duration: 3000 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: posX.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: "absolute", left: x, bottom: GROUND_Y + y },
        animStyle,
      ]}
    >
      <Ionicons name="navigate" size={20} color="#8BAFD4" style={{ transform: [{ rotate: "45deg" }] }} />
    </Animated.View>
  );
}

interface GrassBladeProps {
  x: number;
  h: number;
  color: string;
}

function GrassBlade({ x, h, color }: GrassBladeProps) {
  return (
    <View
      style={{
        position: "absolute",
        left: x,
        bottom: GROUND_Y - 4,
        width: 4,
        height: h,
        backgroundColor: color,
        borderRadius: 2,
        transform: [{ rotate: `${(Math.sin(x * 0.3) * 8).toFixed(1)}deg` }],
      }}
    />
  );
}

interface GardenSceneProps {
  totalCompletions: number;
}

export function GardenScene({ totalCompletions }: GardenSceneProps) {
  const W = SCREEN_WIDTH;
  const tc = totalCompletions;

  const grassBlades = React.useMemo(() => {
    const blades: { x: number; h: number; color: string }[] = [];
    const colors = ["#5A9E5A", "#4E8E4E", "#68B068", "#52945A"];
    for (let i = 0; i < 60; i++) {
      blades.push({
        x: (i / 60) * (W - 12) + 6,
        h: 12 + Math.abs(Math.sin(i * 1.7)) * 14,
        color: colors[i % colors.length],
      });
    }
    return blades;
  }, [W]);

  return (
    <View style={[styles.container, { width: W, height: GARDEN_HEIGHT }]}>
      <LinearGradient
        colors={["#C2DCF7", "#D8EDFB", "#EEF6FF"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Clouds */}
      <View style={[styles.cloud, { top: 30, left: W * 0.1, width: 80, height: 28 }]} />
      <View style={[styles.cloud, { top: 22, left: W * 0.1 + 20, width: 60, height: 24 }]} />
      <View style={[styles.cloud, { top: 50, left: W * 0.6, width: 70, height: 26 }]} />
      <View style={[styles.cloud, { top: 44, left: W * 0.6 + 18, width: 55, height: 22 }]} />

      {/* Sun */}
      <View
        style={{
          position: "absolute",
          top: 24,
          right: 28,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "#FFE082",
          shadowColor: "#FFD740",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
        }}
      />

      {/* Ground */}
      <LinearGradient
        colors={["#7DBB6A", "#5A9E5A"]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: GROUND_Y + 10,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Grass blades */}
      {grassBlades.map((b, i) => (
        <GrassBlade key={i} x={b.x} h={b.h} color={b.color} />
      ))}

      {/* Garden elements — appear based on totalCompletions */}

      {tc >= 1 && (
        <FlowerElement x={W * 0.22} y={0} color="#F4A8C8" size={44} delay={0} />
      )}
      {tc >= 3 && (
        <FlowerElement x={W * 0.75} y={0} color="#F0C870" size={40} delay={200} />
      )}
      {tc >= 5 && (
        <TreeElement
          x={W * 0.15}
          y={0}
          size={72}
          delay={300}
          trunkColor="#8B6340"
          canopyColor="#6CB86C"
        />
      )}
      {tc >= 7 && (
        <FlowerElement x={W * 0.48} y={0} color="#A8A8F0" size={38} delay={150} />
      )}
      {tc >= 10 && (
        <ButterflyElement x={W * 0.55} y={80} color="#E89494" delay={400} />
      )}
      {tc >= 12 && (
        <TreeElement
          x={W * 0.78}
          y={0}
          size={88}
          delay={350}
          trunkColor="#7A5230"
          canopyColor="#5AA06A"
        />
      )}
      {tc >= 14 && (
        <FlowerElement x={W * 0.35} y={0} color="#F0A870" size={42} delay={180} />
      )}
      {tc >= 16 && (
        <ButterflyElement x={W * 0.3} y={100} color="#A094E8" delay={600} />
      )}
      {tc >= 18 && (
        <FlowerElement x={W * 0.62} y={0} color="#88D4AB" size={36} delay={220} />
      )}
      {tc >= 20 && (
        <BirdElement x={W * 0.45} y={180} delay={500} />
      )}
      {tc >= 22 && (
        <TreeElement
          x={W * 0.5}
          y={0}
          size={96}
          delay={400}
          trunkColor="#8B6340"
          canopyColor="#68B878"
        />
      )}
      {tc >= 25 && (
        <ButterflyElement x={W * 0.7} y={130} color="#F4A8C8" delay={700} />
      )}
      {tc >= 28 && (
        <FlowerElement x={W * 0.88} y={0} color="#A8D0F0" size={38} delay={250} />
      )}
      {tc >= 30 && (
        <BirdElement x={W * 0.2} y={200} delay={800} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  cloud: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
  },
});
