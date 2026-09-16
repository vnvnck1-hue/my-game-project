# Hooded Mechanic Animation v1

붉은 후드 정비공 캐릭터의 러프 최소 키프레임 리소스다.

## 구성

- 마스터 시트: `Sheets/hooded_mechanic_all_4x4_v1.png`
- 클립별 시트: `Sheets/hooded_mechanic_<clip>_4f_v1.png`
- 개별 프레임: `Frames/<clip>/<clip>_01.png`부터 `04.png`
- 메타데이터: `hooded_mechanic_animation_v1.json`

## 마스터 시트 배열

- 1행: Idle 4프레임
- 2행: Walk 4프레임
- 3행: Shoot 4프레임
- 4행: Crouch 4프레임

각 셀은 320 × 320 px이며 캐릭터는 오른쪽을 바라본다.

## 공통 피벗

- 피벗: Bottom Center
- 정규화 좌표: X = 0.5, Y = 0.0
- 모든 프레임의 최하단 접촉 픽셀: 셀 Y = 319

총과 팔이 오른쪽으로 뻗는 사격 프레임에서도 몸통 기준 위치를 옮기지 않는다.

## 권장 재생값

- Idle: 4 FPS, Loop
- Walk: 8 FPS, Loop
- Shoot: 10 FPS, No Loop
- Crouch: 6 FPS, No Loop

러프 키프레임이므로 실제 조작감에 맞춰 프레임 유지 시간을 조절한다.

## 임포트 권장값

- Filter Mode: Point / Nearest
- Compression: None
- Mip Maps: Off
- Mesh Type: Full Rect
- Pivot: Bottom Center
