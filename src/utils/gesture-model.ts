"use client";

import * as tf from "@tensorflow/tfjs";
import type { DemoGesturePrediction, HandLandmarkPoint } from "@/utils/gesture-prediction";

export type GestureModelStatus = "idle" | "loading" | "ready" | "error";

type BatchNormWeights = {
  gamma: number[];
  beta: number[];
  movingMean: number[];
  movingVariance: number[];
  epsilon: number;
};

type ConvWeights = {
  kernel: number[][][];
  bias: number[];
};

type DenseWeights = {
  kernel: number[][];
  bias: number[];
};

type GestureWeightPayload = {
  labels: TrainingGestureLabel[];
  sequenceLength: number;
  featureDim: number;
  maxHands: number;
  pointsPerHand: number;
  valuesPerPoint: number;
  confidenceThreshold: number;
  layers: {
    conv1d: ConvWeights;
    batch_normalization: BatchNormWeights;
    conv1d_1: ConvWeights;
    batch_normalization_1: BatchNormWeights;
    dense: DenseWeights;
    dense_1: DenseWeights;
  };
};

type TrainingGestureLabel = "drink" | "eat" | "help" | "no" | "sit" | "toilet" | "yes";

type GestureWeightTensors = {
  conv1Kernel: tf.Tensor3D;
  conv1Bias: tf.Tensor1D;
  bn1Gamma: tf.Tensor1D;
  bn1Beta: tf.Tensor1D;
  bn1Mean: tf.Tensor1D;
  bn1Variance: tf.Tensor1D;
  conv2Kernel: tf.Tensor3D;
  conv2Bias: tf.Tensor1D;
  bn2Gamma: tf.Tensor1D;
  bn2Beta: tf.Tensor1D;
  bn2Mean: tf.Tensor1D;
  bn2Variance: tf.Tensor1D;
  dense1Kernel: tf.Tensor2D;
  dense1Bias: tf.Tensor1D;
  dense2Kernel: tf.Tensor2D;
  dense2Bias: tf.Tensor1D;
};

const MODEL_WEIGHTS_URL = "/models/makalearn-gesture/cnn-weights.json";
const FIXED_SEQUENCE_LENGTH = 64;
const FEATURE_DIM = 126;
const MAX_HANDS = 2;
const POINTS_PER_HAND = 21;
const VALUES_PER_POINT = 3;

const labelToPracticeLabel: Record<TrainingGestureLabel, string> = {
  drink: "I want to drink water",
  eat: "I want to eat food",
  help: "Help",
  no: "No",
  sit: "Sit down",
  toilet: "I want to go to toilet",
  yes: "Yes"
};

const labelToPose: Record<TrainingGestureLabel, string> = {
  drink: "Drinking gesture",
  eat: "Eating gesture",
  help: "Help gesture",
  no: "No gesture",
  sit: "Sit gesture",
  toilet: "Toilet gesture",
  yes: "Yes gesture"
};

let loadedModelPromise: Promise<MakaLearnGestureModel> | null = null;

export function appendLiveGestureFrame(buffer: Float32Array[], hands: HandLandmarkPoint[][]) {
  if (!hands.length) return;
  buffer.push(normalizeHandsForModel(hands));
  if (buffer.length > FIXED_SEQUENCE_LENGTH) {
    buffer.splice(0, buffer.length - FIXED_SEQUENCE_LENGTH);
  }
}

export function resetLiveGestureBuffer(buffer: Float32Array[]) {
  buffer.length = 0;
}

export async function predictMakaLearnGesture(buffer: Float32Array[]) {
  if (buffer.length < FIXED_SEQUENCE_LENGTH) return null;
  const model = await loadMakaLearnGestureModel();
  return model.predict(buffer.slice(-FIXED_SEQUENCE_LENGTH));
}

export function disposeMakaLearnGestureModel() {
  loadedModelPromise?.then((model) => model.dispose()).catch(() => undefined);
  loadedModelPromise = null;
}

async function loadMakaLearnGestureModel() {
  if (!loadedModelPromise) {
    loadedModelPromise = fetch(MODEL_WEIGHTS_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Gesture model weights could not be loaded.");
        return response.json() as Promise<GestureWeightPayload>;
      })
      .then((payload) => new MakaLearnGestureModel(payload));
  }
  return loadedModelPromise;
}

class MakaLearnGestureModel {
  private readonly tensors: GestureWeightTensors;
  private readonly labels: TrainingGestureLabel[];
  private readonly confidenceThreshold: number;
  private readonly bn1Epsilon: number;
  private readonly bn2Epsilon: number;

  constructor(private readonly payload: GestureWeightPayload) {
    this.labels = payload.labels;
    this.confidenceThreshold = payload.confidenceThreshold;
    this.bn1Epsilon = payload.layers.batch_normalization.epsilon;
    this.bn2Epsilon = payload.layers.batch_normalization_1.epsilon;
    this.tensors = {
      conv1Kernel: tf.tensor3d(payload.layers.conv1d.kernel, [5, FEATURE_DIM, 64]),
      conv1Bias: tf.tensor1d(payload.layers.conv1d.bias),
      bn1Gamma: tf.tensor1d(payload.layers.batch_normalization.gamma),
      bn1Beta: tf.tensor1d(payload.layers.batch_normalization.beta),
      bn1Mean: tf.tensor1d(payload.layers.batch_normalization.movingMean),
      bn1Variance: tf.tensor1d(payload.layers.batch_normalization.movingVariance),
      conv2Kernel: tf.tensor3d(payload.layers.conv1d_1.kernel, [3, 64, 128]),
      conv2Bias: tf.tensor1d(payload.layers.conv1d_1.bias),
      bn2Gamma: tf.tensor1d(payload.layers.batch_normalization_1.gamma),
      bn2Beta: tf.tensor1d(payload.layers.batch_normalization_1.beta),
      bn2Mean: tf.tensor1d(payload.layers.batch_normalization_1.movingMean),
      bn2Variance: tf.tensor1d(payload.layers.batch_normalization_1.movingVariance),
      dense1Kernel: tf.tensor2d(payload.layers.dense.kernel, [128, 96]),
      dense1Bias: tf.tensor1d(payload.layers.dense.bias),
      dense2Kernel: tf.tensor2d(payload.layers.dense_1.kernel, [96, 7]),
      dense2Bias: tf.tensor1d(payload.layers.dense_1.bias)
    };
  }

  async predict(sequence: Float32Array[]): Promise<DemoGesturePrediction | null> {
    const flatSequence = new Float32Array(FIXED_SEQUENCE_LENGTH * FEATURE_DIM);
    sequence.forEach((frame, index) => {
      flatSequence.set(frame, index * FEATURE_DIM);
    });

    const probabilitiesTensor = tf.tidy(() => {
      const input = tf.tensor3d(flatSequence, [1, FIXED_SEQUENCE_LENGTH, FEATURE_DIM]);
      const conv1 = tf.add(tf.conv1d(input, this.tensors.conv1Kernel, 1, "same"), this.tensors.conv1Bias).relu() as tf.Tensor3D;
      const bn1 = tf.batchNorm(
        conv1,
        this.tensors.bn1Mean,
        this.tensors.bn1Variance,
        this.tensors.bn1Beta,
        this.tensors.bn1Gamma,
        this.bn1Epsilon
      );
      const pooled = tf.maxPool(bn1.expandDims(2) as tf.Tensor4D, [2, 1], [2, 1], "valid").squeeze([2]) as tf.Tensor3D;
      const conv2 = tf.add(tf.conv1d(pooled, this.tensors.conv2Kernel, 1, "same"), this.tensors.conv2Bias).relu() as tf.Tensor3D;
      const bn2 = tf.batchNorm(
        conv2,
        this.tensors.bn2Mean,
        this.tensors.bn2Variance,
        this.tensors.bn2Beta,
        this.tensors.bn2Gamma,
        this.bn2Epsilon
      );
      const averaged = bn2.mean(1) as tf.Tensor2D;
      const dense1 = tf.add(tf.matMul(averaged, this.tensors.dense1Kernel), this.tensors.dense1Bias).relu() as tf.Tensor2D;
      return tf.softmax(tf.add(tf.matMul(dense1, this.tensors.dense2Kernel), this.tensors.dense2Bias));
    });

    const probabilities = Array.from(await probabilitiesTensor.data());
    probabilitiesTensor.dispose();

    const bestIndex = probabilities.reduce(
      (best, value, index) => (value > probabilities[best] ? index : best),
      0
    );
    const confidence = probabilities[bestIndex] ?? 0;
    if (confidence < this.confidenceThreshold) return null;

    const trainingLabel = this.labels[bestIndex];
    return {
      label: labelToPracticeLabel[trainingLabel],
      pose: labelToPose[trainingLabel],
      fingers: [],
      handCount: 1,
      matchPercent: Math.round(confidence * 100)
    };
  }

  dispose() {
    Object.values(this.tensors).forEach((tensor) => tensor.dispose());
  }
}

function normalizeHandsForModel(hands: HandLandmarkPoint[][]) {
  const features = new Float32Array(FEATURE_DIM);
  hands.slice(0, MAX_HANDS).forEach((hand, handIndex) => {
    const normalized = normalizeSingleHand(hand);
    features.set(normalized, handIndex * POINTS_PER_HAND * VALUES_PER_POINT);
  });
  return features;
}

function normalizeSingleHand(hand: HandLandmarkPoint[]) {
  const values = new Float32Array(POINTS_PER_HAND * VALUES_PER_POINT);
  if (!hand.length) return values;

  const wrist = hand[0];
  const shifted = hand.slice(0, POINTS_PER_HAND).map((point) => ({
    x: Number(point.x) - Number(wrist.x),
    y: Number(point.y) - Number(wrist.y),
    z: Number(point.z) - Number(wrist.z)
  }));

  const middleMcp = shifted[9];
  let scale = middleMcp ? Math.hypot(middleMcp.x, middleMcp.y) : 0;
  if (scale < 1e-6) {
    scale = shifted.reduce((largest, point) => Math.max(largest, Math.hypot(point.x, point.y)), 0);
  }
  if (scale < 1e-6) scale = 1;

  shifted.forEach((point, index) => {
    const offset = index * VALUES_PER_POINT;
    values[offset] = point.x / scale;
    values[offset + 1] = point.y / scale;
    values[offset + 2] = point.z / scale;
  });
  return values;
}

