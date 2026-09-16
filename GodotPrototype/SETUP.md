# 다른 PC에서 실행하기 — Godot 설치 안내

이 프로젝트는 여러 PC를 옮겨다니며 작업하는 것을 전제로 한다.
**새 PC에서는 `setup.bat` 한 번 → 이후 `run.bat`** 만 실행하면 된다. 경로를 손으로 고칠 일은 없다.

## 필요한 Godot 버전

- **Godot 4.7.x Standard** (개발·검증 버전: 4.7.2-stable)
- GDScript 만 사용하므로 Standard 로 충분하다. .NET(mono) 버전이 이미 있으면 그대로 동작한다.
- Godot 4.4 이상이면 대부분 열리지만, 4.7 미만에서는 씬 파일 재변환 안내가 뜰 수 있다. 3.x 는 지원하지 않는다.

## 새 PC 세팅 순서 (Windows)

1. 저장소를 클론한다.
2. `GodotPrototype/setup.bat` 실행 — WinGet 으로 Godot 4.7 Standard 를 설치한다 (이미 있으면 건너뜀).
   winget 이 없는 PC 라면 https://godotengine.org/download/windows/ 에서 4.7.x Standard 를 받아
   **`C:\Godot`** 에 압축 해제하면 된다.
3. `GodotPrototype/run.bat` 실행 — 첫 실행 시 `.godot/` 캐시를 자동으로 만든 뒤 게임을 띄운다.

수동으로 하려면: Godot 실행 → 프로젝트 매니저에서 **Import** → `GodotPrototype/project.godot` → **F5**.

## run.bat 가 Godot 을 찾는 순서

1. 환경변수 `GODOT` (특정 실행 파일을 강제할 때. 예: `set GODOT=D:\Tools\Godot_v4.7.2-stable_win64.exe`)
2. PATH 의 `godot` / `godot_console`, 또는 WinGet Links 폴더
3. WinGet 패키지 폴더 (Standard, Mono 모두)
4. `C:\Godot`, `%USERPROFILE%\Godot`, `%ProgramFiles%\Godot`, 저장소의 `Tools\Godot`

`run.bat` 뒤에 붙인 인자는 Godot 에 그대로 전달된다. 예) `run.bat --headless --quit-after 60`

## 저장소에 넣지 않는 것

- `GodotPrototype/.godot/` — PC별 임포트 캐시. `.gitignore` 로 제외돼 있고 첫 실행 때 자동 생성된다.
- `*.import` 파일은 커밋한다. 임포트 설정이 PC 간에 같아야 하기 때문이다.

## 조작법과 구조

`README.md` 참고.
