import os
import sys
from collections import Counter
from pathlib import Path
import numpy as np
import onnx

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.ai.config import resolve_model_path


def analyze_onnx_model(label: str, rel_path: str):
    full_path = resolve_model_path(rel_path)
    print("\n" + "=" * 70)
    print(f"DEEP GRAPH FORENSIC ANALYSIS: {label}")
    print("=" * 70)
    print(f"File: {full_path}")

    model = onnx.load(full_path)
    graph = model.graph

    print(f"IR Version:         {model.ir_version}")
    print(f"Producer Name:      '{model.producer_name}'")
    print(f"Producer Version:   '{model.producer_version}'")
    print(f"Opset Imports:      {[(op.domain, op.version) for op in model.opset_import]}")

    # Graph inputs
    print("\n--- GRAPH INPUTS ---")
    for inp in graph.input:
        shape = [d.dim_value if d.dim_value > 0 else d.dim_param for d in inp.type.tensor_type.shape.dim]
        print(f"  Name: '{inp.name}' | Type: {inp.type.tensor_type.elem_type} | Shape: {shape}")

    # Graph outputs
    print("\n--- GRAPH OUTPUTS ---")
    for out in graph.output:
        shape = [d.dim_value if d.dim_value > 0 else d.dim_param for d in out.type.tensor_type.shape.dim]
        print(f"  Name: '{out.name}' | Type: {out.type.tensor_type.elem_type} | Shape: {shape}")

    # Node count and operator breakdown
    nodes = graph.node
    op_counts = Counter(node.op_type for node in nodes)
    print(f"\n--- GRAPH NODES (Total: {len(nodes)}) ---")
    print("Operator Breakdown (Sorted by frequency):")
    for op_type, count in op_counts.most_common():
        print(f"  {op_type:20s}: {count:4d}")

    # Initializers (Weights / Biases)
    inits = graph.initializer
    total_params = 0
    param_types = Counter()
    for init in inits:
        dims = list(init.dims)
        numel = int(np.prod(dims)) if dims else 1
        total_params += numel
        param_types[init.data_type] += 1

    print(f"\n--- WEIGHT INITIALIZERS (Total Tensors: {len(inits)}) ---")
    print(f"Total Parameters:    {total_params:,} ({total_params/1e6:.2f}M)")
    print(f"Data Types:         {dict(param_types)}")

    # Inspect first 5 and last 5 nodes
    print("\n--- FIRST 5 NODES (Architecture Entry) ---")
    for i, node in enumerate(nodes[:5]):
        print(f"  Node {i+1}: Op='{node.op_type}', Name='{node.name}', Inputs={list(node.input)}, Outputs={list(node.output)}")

    print("\n--- LAST 5 NODES (Architecture Exit) ---")
    for i, node in enumerate(nodes[-5:]):
        print(f"  Node {len(nodes)-4+i}: Op='{node.op_type}', Name='{node.name}', Inputs={list(node.input)}, Outputs={list(node.output)}")


def main():
    analyze_onnx_model("AASIST-L Deepfake Anti-Spoofing", "models/weights/deepfake/aasist-l.onnx")
    analyze_onnx_model("ECAPA-TDNN Speaker Embedding", "models/weights/speaker/voxceleb.onnx")


if __name__ == "__main__":
    main()
