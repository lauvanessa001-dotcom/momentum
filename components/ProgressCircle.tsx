import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface ProgressCircleProps {
  progress: number;
  size: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  label?: string;
  labelSize?: number;
}

export function ProgressCircle({
  progress,
  size,
  strokeWidth = 8,
  color,
  trackColor,
  children,
  label,
  labelSize = 14,
}: ProgressCircleProps) {
  const colors = useColors();
  const ringColor = color ?? colors.primary;
  const ringTrack = trackColor ?? colors.muted;
  const p = Math.min(Math.max(progress, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - p);

  if (Platform.OS === "web") {
    return (
      <View style={{ width: size, height: size, position: "relative" }}>
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: ringTrack,
          }}
        />
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {children}
          {label && (
            <Text style={{ fontSize: labelSize, color: colors.mutedForeground }}>
              {label}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: [{ rotate: "-90deg" }],
        }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {children}
        {label && (
          <Text style={{ fontSize: labelSize, color: colors.mutedForeground, marginTop: 2 }}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}
