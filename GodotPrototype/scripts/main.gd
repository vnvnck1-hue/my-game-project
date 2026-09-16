extends Node2D
## 방 로딩·전환, 카메라, HUD 를 담당하는 메인 씬.

const START_ROOM := "workshop"
const START_X := 1840.0 - 96.0 + 120.0      # 검증 이미지의 캐릭터 위치(발 중심)
const WALL_MARGIN := 110.0                   # 캡 타일 안쪽 벽까지의 여유
const DOOR_PASS_MARGIN := 60.0              # 열린 측벽문으로 들어갈 때 허용되는 초과 거리
const SIDE_PAD := 180.0                      # 카메라가 방 밖 어두운 여백을 보여주는 폭
const FADE_TIME := 0.22
const CAMERA_ZOOM := 0.5                     # 원본 픽셀의 1/2 크기로 표시 (정수 배율 축소)

var current_room: Room
var player: Player
var camera: Camera2D
var bullets: Node2D
var fade: ColorRect
var title_label: Label
var hint_label: Label
var prompt_label: Label
var transitioning := false


func _ready() -> void:
	_setup_input_map()
	_setup_ui()

	player = Player.new()
	player.name = "Player"
	player.z_index = 5
	player.shoot_fired.connect(_on_player_shoot)
	player.request_front_door.connect(_on_front_door_requested)

	bullets = Node2D.new()
	bullets.name = "Bullets"
	bullets.z_index = 6

	camera = Camera2D.new()
	camera.name = "Camera"
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 8.0
	camera.zoom = Vector2(CAMERA_ZOOM, CAMERA_ZOOM)

	add_child(player)
	add_child(bullets)
	add_child(camera)
	_load_room(START_ROOM, START_X, 1)
	camera.make_current()
	camera.reset_smoothing()


func _process(_delta: float) -> void:
	if Input.is_action_just_pressed("toggle_fullscreen"):
		var w := get_window()
		w.mode = Window.MODE_WINDOWED if w.mode == Window.MODE_FULLSCREEN else Window.MODE_FULLSCREEN

	if current_room == null:
		return

	# 카메라: 플레이어 X 추적, 방 범위로 제한
	camera.position = Vector2(player.position.x, RoomData.TILE_HEIGHT * 0.5)

	if transitioning:
		return

	# 측벽문 통과 판정
	if current_room.right_door_open and player.position.x >= current_room.width - 10:
		_go_to_room(current_room.right_target, "left")
	elif current_room.left_door_open and player.position.x <= 10:
		_go_to_room(current_room.left_target, "right")

	# 정면문 안내 문구
	var fd := current_room.front_door_near(player.position.x)
	prompt_label.visible = not fd.is_empty()
	if not fd.is_empty():
		prompt_label.text = "▲  W / ↑  —  %s 으로 들어가기" % RoomData.get_room(fd["target"])["title"]


func _load_room(id: String, spawn_x: float, face_dir: int) -> void:
	if current_room:
		current_room.queue_free()
	for b in bullets.get_children():
		b.queue_free()

	current_room = Room.new()
	current_room.name = "Room_" + id
	current_room.build(id)
	add_child(current_room)
	move_child(current_room, 0)

	# 이동 한계: 닫힌 쪽은 벽 앞에서 멈추고, 열린 쪽은 문을 지나갈 수 있게 조금 더 허용
	var left_limit := -DOOR_PASS_MARGIN if current_room.left_door_open else WALL_MARGIN
	var right_limit := current_room.width + DOOR_PASS_MARGIN if current_room.right_door_open else current_room.width - WALL_MARGIN
	player.position = Vector2(spawn_x, RoomData.FLOOR_Y + 2)
	player.set_bounds(left_limit, right_limit)
	player.face(face_dir)

	_apply_camera_limits()
	title_label.text = RoomData.get_room(id)["title"]


func _apply_camera_limits() -> void:
	var vp := get_viewport_rect().size / CAMERA_ZOOM   # 줌을 반영한 실제 월드 가시 폭
	var room_w := float(current_room.width) + SIDE_PAD * 2.0
	var left := -SIDE_PAD
	var right := current_room.width + SIDE_PAD
	if room_w < vp.x:
		# 방이 화면보다 좁으면 가운데 고정
		var cx := current_room.width * 0.5
		left = cx - vp.x * 0.5
		right = cx + vp.x * 0.5
	camera.limit_left = int(left)
	camera.limit_right = int(right)
	var cy := RoomData.TILE_HEIGHT * 0.5
	camera.limit_top = int(cy - vp.y * 0.5)
	camera.limit_bottom = int(cy + vp.y * 0.5)


## 측벽문으로 이동. enter_side = 목표 방에서 등장하는 쪽("left"/"right")
func _go_to_room(target: String, enter_side: String) -> void:
	var target_w := RoomData.room_width(target)
	var spawn_x := 120.0 if enter_side == "left" else target_w - 120.0
	var face_dir := 1 if enter_side == "left" else -1
	_transition(target, spawn_x, face_dir)


func _on_front_door_requested() -> void:
	if transitioning or current_room == null:
		return
	var fd := current_room.front_door_near(player.position.x)
	if fd.is_empty():
		return
	var target: String = fd["target"]
	var tmp := Room.new()
	tmp.build(target)
	var spawn_x := tmp.front_door_spawn_x(fd["target_door"])
	tmp.free()
	_transition(target, spawn_x, player.facing)


func _transition(target: String, spawn_x: float, face_dir: int) -> void:
	transitioning = true
	player.input_enabled = false
	var tw := create_tween()
	tw.tween_property(fade, "color:a", 1.0, FADE_TIME)
	tw.tween_callback(func():
		_load_room(target, spawn_x, face_dir)
		camera.position = Vector2(player.position.x, RoomData.TILE_HEIGHT * 0.5)
		camera.reset_smoothing()
	)
	tw.tween_property(fade, "color:a", 0.0, FADE_TIME)
	tw.tween_callback(func():
		transitioning = false
		player.input_enabled = true
	)


func _on_player_shoot(muzzle_pos: Vector2, dir: int) -> void:
	var b := Bullet.new()
	b.dir = dir
	b.room_width = current_room.width
	b.position = muzzle_pos
	bullets.add_child(b)


func _setup_ui() -> void:
	var layer := CanvasLayer.new()
	layer.name = "UI"
	layer.layer = 10
	add_child(layer)

	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Malgun Gothic", "맑은 고딕", "Segoe UI", "Noto Sans CJK KR"])

	title_label = Label.new()
	title_label.position = Vector2(24, 18)
	title_label.add_theme_font_override("font", font)
	title_label.add_theme_font_size_override("font_size", 30)
	title_label.add_theme_color_override("font_color", Color(0.92, 0.9, 0.85))
	layer.add_child(title_label)

	hint_label = Label.new()
	hint_label.text = "A/D ←/→ 이동    S/↓ 숙이기    J / Space 사격    W/↑ 정면문 진입    F11 전체화면    열린 측벽문은 걸어서 통과"
	hint_label.position = Vector2(24, 860)
	hint_label.add_theme_font_override("font", font)
	hint_label.add_theme_font_size_override("font_size", 20)
	hint_label.add_theme_color_override("font_color", Color(0.7, 0.72, 0.8))
	layer.add_child(hint_label)

	prompt_label = Label.new()
	prompt_label.position = Vector2(0, 96)
	prompt_label.size = Vector2(1600, 40)
	prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label.add_theme_font_override("font", font)
	prompt_label.add_theme_font_size_override("font_size", 26)
	prompt_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.4))
	prompt_label.visible = false
	layer.add_child(prompt_label)

	fade = ColorRect.new()
	fade.color = Color(0, 0, 0, 0)
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(fade)


func _setup_input_map() -> void:
	_add_action("move_left", [KEY_A, KEY_LEFT])
	_add_action("move_right", [KEY_D, KEY_RIGHT])
	_add_action("interact", [KEY_W, KEY_UP])
	_add_action("crouch", [KEY_S, KEY_DOWN])
	_add_action("shoot", [KEY_J, KEY_SPACE, KEY_Z])
	_add_action("toggle_fullscreen", [KEY_F11])


func _add_action(action: String, keys: Array) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for k in keys:
		var ev := InputEventKey.new()
		ev.physical_keycode = k
		InputMap.action_add_event(action, ev)
