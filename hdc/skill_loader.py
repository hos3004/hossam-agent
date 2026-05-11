import os
import re
import yaml
from dataclasses import dataclass, field
from typing import Optional
from loguru import logger


@dataclass
class SkillEntry:
    id: str
    version: str
    priority: str
    language: str
    safety_level: str
    purpose: str
    triggers: list[str] = field(default_factory=list)
    rules: list[str] = field(default_factory=list)
    output_format: str = ""
    raw_content: str = ""
    file_path: str = ""
    conflicts_with: list[str] = field(default_factory=list)
    wins_over: list[str] = field(default_factory=list)
    do_not_use_when: list[str] = field(default_factory=list)


class SkillLoader:
    def __init__(self, skills_dir: str = None):
        if skills_dir is None:
            skills_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "skills"
            )
        self.skills_dir = skills_dir
        self._skills: dict[str, SkillEntry] = {}

    def _parse_frontmatter(self, text: str) -> tuple[dict, str]:
        """Parse YAML frontmatter between --- markers using PyYAML."""
        text = text.strip()
        if not text.startswith("---"):
            return {}, text

        end = text.find("---", 3)
        if end == -1:
            return {}, text

        header = text[3:end].strip()
        body = text[end + 3 :].strip()

        try:
            meta = yaml.safe_load(header)
            if not isinstance(meta, dict):
                meta = {}
        except yaml.YAMLError:
            meta = {}

        return meta, body

    def _extract_section(self, text: str, heading: str) -> str:
        """Extract content under a ## heading."""
        pattern = rf"^##\s*{re.escape(heading)}.*?\n(.*?)(?=^##|\Z)"
        match = re.search(pattern, text, re.MULTILINE | re.DOTALL)
        if match:
            return match.group(1).strip()
        return ""

    def _extract_bullets(self, text: str) -> list[str]:
        """Extract bullet list items."""
        return [line.strip("- ").strip() for line in text.split("\n") if line.strip().startswith("- ")]

    def load_all(self) -> dict[str, SkillEntry]:
        """Load all skills from /skills directory."""
        if not os.path.isdir(self.skills_dir):
            logger.warning(f"Skills directory not found: {self.skills_dir}")
            return {}

        self._skills = {}
        for skill_name in sorted(os.listdir(self.skills_dir)):
            skill_path = os.path.join(self.skills_dir, skill_name)
            skill_file = os.path.join(skill_path, "SKILL.md")
            if not os.path.isdir(skill_path) or not os.path.isfile(skill_file):
                continue
            try:
                entry = self._load_single(skill_file)
                if entry:
                    self._skills[entry.id] = entry
                    logger.info(f"Skill loaded: {entry.id} (v{entry.version}, {entry.priority})")
            except Exception as e:
                logger.error(f"Failed to load skill {skill_name}: {e}")

        logger.info(f"Total skills loaded: {len(self._skills)}")
        return self._skills

    def _load_single(self, file_path: str) -> Optional[SkillEntry]:
        """Load and parse a single SKILL.md file."""
        with open(file_path, "r", encoding="utf-8") as f:
            raw = f.read()

        meta, body = self._parse_frontmatter(raw)
        if not meta or "id" not in meta:
            logger.warning(f"Missing metadata in {file_path}, skipping")
            return None

        purpose = self._extract_section(body, "Purpose")
        rules_text = self._extract_section(body, "Rules") or ""
        output_format = self._extract_section(body, "Output") or self._extract_section(body, "Output Format") or ""

        triggers = []
        triggers_section = self._extract_section(body, "Trigger") or ""
        if triggers_section:
            triggers = self._extract_bullets(triggers_section)

        if "use_when" in meta and isinstance(meta["use_when"], list):
            triggers.extend(meta["use_when"])

        rules = self._extract_bullets(rules_text) if rules_text else []

        return SkillEntry(
            id=meta.get("id", skill_name_from_path(file_path)),
            version=meta.get("version", "0.0.0"),
            priority=meta.get("priority", "medium"),
            language=meta.get("language", "ar"),
            safety_level=meta.get("safety_level", "low"),
            purpose=purpose or "No purpose defined",
            triggers=triggers,
            rules=rules,
            output_format=output_format,
            raw_content=raw,
            file_path=file_path,
            conflicts_with=meta.get("conflicts_with", []) if isinstance(meta.get("conflicts_with"), list) else [],
            wins_over=meta.get("wins_over", []) if isinstance(meta.get("wins_over"), list) else [],
            do_not_use_when=meta.get("do_not_use_when", []) if isinstance(meta.get("do_not_use_when"), list) else [],
        )

    def build_skills_section(self) -> str:
        """Build a formatted skills instruction section for system prompt."""
        if not self._skills:
            return ""

        lines = [
            "\n## Available Skills",
            "",
            "You have access to the following skills. When the user's request matches a skill's triggers, follow that skill's rules exactly.",
            "",
        ]

        for skill_id in sorted(self._skills.keys()):
            skill = self._skills[skill_id]
            lines.append(f"### {skill_id} ({skill.priority})")
            lines.append(f"**Purpose:** {skill.purpose}")
            if skill.triggers:
                lines.append(f"**Triggers:** {', '.join(skill.triggers[:5])}")
            if skill.rules:
                lines.append(f"**Key Rules:** {len(skill.rules)} rules defined")
            if skill.output_format:
                lines.append("**Output format:** Defined in skill")
            lines.append("")

        return "\n".join(lines)

    def get_skill(self, skill_id: str) -> Optional[SkillEntry]:
        return self._skills.get(skill_id)

    def get_all_skills(self) -> dict[str, SkillEntry]:
        return self._skills

    @property
    def skills_loaded(self) -> int:
        return len(self._skills)


def skill_name_from_path(path: str) -> str:
    return os.path.basename(os.path.dirname(path))
