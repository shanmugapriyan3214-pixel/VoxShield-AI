/**
 * VoxShield AI — ONNX Runtime Mobile Bridge
 *
 * TypeScript interface and stub implementation for future on-device AI inference
 * using ONNX Runtime Mobile on Android.
 *
 * Current state: All AI inference is delegated to the backend server, which runs
 * AASIST-L (deepfake detection) and ECAPA-TDNN (speaker verification) models.
 * The frontend submits DSP telemetry and receives threat assessments.
 *
 * Future native implementation will:
 *   - Load AASIST-L .onnx model for on-device deepfake detection
 *   - Load ECAPA-TDNN .onnx model for on-device speaker verification
 *   - Run inference locally with zero network latency
 *   - Maintain the ZERO-SERVER-AUDIO invariant (no audio ever leaves the device)
 *   - Use ONNX Runtime Mobile (com.microsoft.onnxruntime:onnxruntime-android)
 *
 * Model specifications:
 *   - AASIST-L: Input [1, 64600] float32 (4s @ 16kHz), Output [1, 2] logits
 *   - ECAPA-TDNN: Input [1, T] float32 (variable length), Output [1, 192] embedding
 */

export interface OnnxModelConfig {
  modelPath: string;          // Path to .onnx file (asset path or file URI)
  modelName: string;          // Human-readable model name
  inputNames: string[];       // Model input tensor names
  outputNames: string[];      // Model output tensor names
  executionProvider: 'cpu' | 'nnapi' | 'gpu';  // Android execution provider
}

export interface InferenceResult {
  outputs: Record<string, Float32Array>;  // Named output tensors
  inferenceTimeMs: number;                // Wall-clock inference duration
  modelName: string;                      // Which model was used
}

export interface OnnxBridge {
  /**
   * Load an ONNX model into memory, ready for inference.
   */
  loadModel(config: OnnxModelConfig): Promise<boolean>;

  /**
   * Run inference on a loaded model.
   */
  runInference(
    modelName: string,
    inputs: Record<string, Float32Array>,
    inputShapes: Record<string, number[]>
  ): Promise<InferenceResult>;

  /**
   * Unload a model from memory.
   */
  unloadModel(modelName: string): Promise<void>;

  /**
   * Check if a model is currently loaded.
   */
  isModelLoaded(modelName: string): boolean;

  /**
   * Get the list of available execution providers on the current device.
   */
  getAvailableProviders(): string[];
}

/**
 * AASIST-L model configuration for deepfake detection.
 */
export const AASIST_L_CONFIG: OnnxModelConfig = {
  modelPath: 'models/aasist_l.onnx',
  modelName: 'aasist-l',
  inputNames: ['input'],
  outputNames: ['output'],
  executionProvider: 'cpu',
};

/**
 * ECAPA-TDNN model configuration for speaker verification.
 */
export const ECAPA_TDNN_CONFIG: OnnxModelConfig = {
  modelPath: 'models/ecapa_tdnn.onnx',
  modelName: 'ecapa-tdnn',
  inputNames: ['input'],
  outputNames: ['embedding'],
  executionProvider: 'cpu',
};

/**
 * Stub implementation of OnnxBridge.
 *
 * Returns a "not available" state for all operations.
 * AI inference continues to be delegated to the backend server
 * via the existing DSP telemetry pipeline (streamAnalyzer → API → ThreatFusionEngine).
 */
export class StubOnnxBridge implements OnnxBridge {
  private loadedModels: Set<string> = new Set();

  async loadModel(config: OnnxModelConfig): Promise<boolean> {
    console.info(
      `[OnnxBridge] Model "${config.modelName}" loading deferred to backend. ` +
      'On-device ONNX Runtime Mobile will be available in a future release.'
    );
    // Mark as "loaded" for API compatibility, but inference delegates to backend
    this.loadedModels.add(config.modelName);
    return true;
  }

  async runInference(
    modelName: string,
    _inputs: Record<string, Float32Array>,
    _inputShapes: Record<string, number[]>
  ): Promise<InferenceResult> {
    // Return empty result — actual inference happens on the backend
    return {
      outputs: {},
      inferenceTimeMs: 0,
      modelName,
    };
  }

  async unloadModel(modelName: string): Promise<void> {
    this.loadedModels.delete(modelName);
  }

  isModelLoaded(modelName: string): boolean {
    return this.loadedModels.has(modelName);
  }

  getAvailableProviders(): string[] {
    return ['backend-delegated'];
  }
}

/**
 * Create the ONNX bridge for the current platform.
 * Currently always returns StubOnnxBridge (inference delegated to backend).
 * Future: return AndroidOnnxBridge with ONNX Runtime Mobile.
 */
export function createOnnxBridge(): OnnxBridge {
  // TODO: When native ONNX Runtime Mobile plugin is implemented:
  // if (isAndroid()) return new AndroidOnnxBridge();
  return new StubOnnxBridge();
}
