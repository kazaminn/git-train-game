#!/usr/bin/env python3

import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
CHAPTERS_PATH = ROOT / "src" / "data" / "chapters.json"
GRAPHS_PATH = ROOT / "src" / "data" / "graph-states.json"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    chapters = load_json(CHAPTERS_PATH)
    graphs = load_json(GRAPHS_PATH)
    graph_keys = set(graphs.keys())
    errors = []
    warnings = []

    for chapter in chapters:
        for scene in chapter.get("scenes", []):
            graph = scene.get("graph")
            if graph and graph not in graph_keys:
                errors.append(f"missing graph: {chapter['title']} -> {graph}")

            text = scene.get("text", "")
            terminal = scene.get("terminal", "")
            combined = f"{text}\n{terminal}"
            if "minatomiral" in combined:
                errors.append(
                    f"legacy typo remains: {chapter['title']} -> {scene.get('text', '')[:24]}"
                )
            if "全6駅" in combined:
                errors.append(
                    f"station count mismatch remains: {chapter['title']} -> {scene.get('text', '')[:24]}"
                )

            if scene.get("choices"):
                correct_count = sum(
                    1 for choice in scene["choices"] if choice.get("correct")
                )
                if correct_count != 1:
                    errors.append(
                        f"question must have exactly one correct choice: {chapter['title']} -> {scene.get('text', '')[:24]}"
                    )

                labels = [choice.get("label", "") for choice in scene["choices"]]
                command_like = any(label.startswith("git ") for label in labels)
                if not command_like and scene.get("choiceStyle") != "concept":
                    warnings.append(
                        f"concept question without choiceStyle: {chapter['title']} -> {scene.get('text', '')[:24]}"
                    )

    if errors:
        print("Errors:")
        for error in errors:
            print(f"  - {error}")

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if not errors and not warnings:
        print("Content checks passed.")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
