# 사이드뷰 작업실 방 이동 프로토타입 (Godot 4.7)

`Docs/RESOURCE_USAGE_GUIDE.md` 의 규칙대로 GameReady 타일·프랍·캐릭터를 조립해,
붉은 후드 정비공을 움직여 4개의 방을 오갈 수 있는 프로토타입이다. GDScript 로만 작성됐다.

## 실행

- 새 PC: `setup.bat` (Godot 설치) → `run.bat`. `run.bat` 은 설치된 Godot 을 자동으로 찾는다. 자세한 건 `SETUP.md`
- 또는 Godot 에디터에서 이 폴더의 `project.godot` 을 열고 F5

## 조작

| 키 | 동작 |
|---|---|
| A / D, ← / → | 좌우 이동 (Walk 8 FPS) |
| S / ↓ (홀드) | 숙이기 — 마지막 프레임 유지, 놓으면 역재생 |
| J / Space / Z | 사격 — 10 FPS 1회 재생, 3번째 프레임에 투사체 생성 |
| W / ↑ | 정면문 앞에서 다른 방으로 진입 |
| F11 | 전체화면 토글 |

열린 측벽문(초록등)은 걸어서 그대로 통과한다. 닫힌 측벽문(주황등)은 벽으로 막힌다.

## 방 연결

```
                 [숙소 Quarters]
                 정면문0      정면문1
                   ↕            ↕
[작업실 Workshop] ⇄ [복도 Corridor] ⇄ [창고 Storage]
   (측벽문)             (측벽문)
```

## 구조

| 파일 | 역할 |
|---|---|
| `scripts/room_data.gd` | 방 정의 데이터(타일 순서, 프랍 좌표, 문 연결). 새 방은 여기에 항목만 추가 |
| `scripts/room.gd` | 데이터로 타일·문·프랍을 조립. 레이어 순서: 타일 → 뒷벽 문 → 프랍 → 캐릭터 → 투사체 |
| `scripts/player.gd` | 캐릭터 상태 머신 (Shoot > Crouch > Walk > Idle), Bottom Center 피벗, X 뒤집기 |
| `scripts/bullet.gd` | 단순 투사체 |
| `scripts/main.gd` | 방 로딩·페이드 전환·카메라 제한·HUD·입력 맵 |
| `scripts/auto_test.gd` | 개발용 자동 테스트. `AutoTest.tscn` 을 실행하면 입력을 시뮬레이션하고 `user://shots/` 에 스크린샷 저장 |

## 가이드 적용 사항

- 리소스는 원본 픽셀 1:1 (뷰포트 1600×900), Nearest 필터, 밉맵 없음
- 타일: Bottom Left 피벗, 같은 Y, `X += 폭` 누적, 캡은 방 끝에만
- 바닥선: 타일 상단 기준 Y = 486 — 캐릭터·프랍 접지 기준
- 캐릭터: 320×320 Full Rect 프레임, offset (-160, -320) 으로 Bottom Center 피벗, `flip_h` 로 왼쪽 방향
- 프랍 좌표는 `Validation/workshop_long_room_tile_prop_validation.json` 의 캔버스 좌표에서 roomOrigin(96,184) 을 뺀 값
