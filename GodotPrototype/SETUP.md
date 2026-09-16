# 다른 PC에서 실행하기 — Godot 설치 안내

## 필요한 Godot 버전

- **Godot 4.7.x** (개발·검증 버전: 4.7.2-stable)
- GDScript 만 사용하므로 **Standard 버전**으로 충분하다. .NET(mono) 버전도 그대로 동작한다.
- Godot 4.4 이상이면 대부분 열리지만, 4.7 미만에서는 씬 파일 재변환 안내가 뜰 수 있다. 3.x 는 지원하지 않는다.

## 설치 방법 (Windows)

- 공식 사이트: https://godotengine.org/download/windows/ 에서 4.7.x Standard 다운로드 후 압축 해제 (설치 과정 없음)
- 또는 WinGet:

```bash
winget install GodotEngine.GodotEngine
```

## 프로젝트 열기

1. 이 저장소를 클론하거나 `GodotPrototype` 폴더를 복사한다. `.godot/` 캐시 폴더는 없어도 첫 실행 때 자동 생성된다.
2. Godot 을 실행하고 프로젝트 매니저에서 **Import** → `GodotPrototype/project.godot` 선택
3. 에디터가 열리면 **F5** 로 실행

## run.bat 사용 시

`run.bat` 은 Godot 실행 파일 경로를 직접 가리킨다. 다른 PC에서는 첫 줄의 `GODOT=` 경로를
그 PC의 Godot 실행 파일 위치로 바꾸면 더블클릭으로 실행할 수 있다.

WinGet 으로 설치했다면 기본 경로는 다음과 비슷하다.

```
%LOCALAPPDATA%\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.x-stable_win64.exe
```

## 조작법과 구조

`README.md` 참고.
