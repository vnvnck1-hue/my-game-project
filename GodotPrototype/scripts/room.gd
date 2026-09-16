class_name Room
extends Node2D
## RoomData 정의를 읽어 배경 타일·프랍·문을 조립하는 방 노드.
## 레이어 순서(뒤→앞): Background Tiles → Back-wall Doors → Floor Props → (Character) → Front Effects

var room_id: String
var width: int = 0
var front_doors: Array = []   # [{"x", "target", "target_door", "center": Vector2}]
var left_door_open := false
var right_door_open := false
var left_target := ""
var right_target := ""

const FRONT_DOOR_W := 315
const FRONT_DOOR_INTERACT_RANGE := 110.0


func build(id: String) -> void:
	room_id = id
	var data := RoomData.get_room(id)
	width = RoomData.room_width(id)

	# 1. 배경 타일 — Bottom Left 피벗, 같은 Y, 간격 없이 X 누적
	var tiles := Node2D.new()
	tiles.name = "Tiles"
	tiles.z_index = 0
	add_child(tiles)
	var x := 0
	for tile_name in data["tiles"]:
		var s := Sprite2D.new()
		s.centered = false
		s.texture = load(RoomData.TILE_DIR + tile_name + ".png")
		s.position = Vector2(x, 0)
		tiles.add_child(s)
		x += RoomData.tile_width(tile_name)

	# 2. 뒷벽 정면문
	var doors := Node2D.new()
	doors.name = "BackWallDoors"
	doors.z_index = 1
	add_child(doors)
	for fd in data["front_doors"]:
		var s := Sprite2D.new()
		s.centered = false
		s.texture = load(RoomData.FRONT_DOOR_TEX)
		s.position = Vector2(fd["x"], 180)
		doors.add_child(s)
		var info: Dictionary = fd.duplicate()
		info["center"] = Vector2(fd["x"] + FRONT_DOOR_W * 0.5, RoomData.FLOOR_Y)
		front_doors.append(info)

	# 3. 측벽문 — 방 좌우 끝 중심에 배치. 왼쪽은 X 뒤집기.
	var ld: Dictionary = data["left_door"]
	var rd: Dictionary = data["right_door"]
	left_door_open = ld.get("open", false)
	right_door_open = rd.get("open", false)
	left_target = ld.get("target", "")
	right_target = rd.get("target", "")
	_add_side_door(doors, 0, left_door_open, true)
	_add_side_door(doors, width, right_door_open, false)

	# 4. 바닥 프랍 — top-left 좌표 그대로(JSON 검증값에 접지 침범 포함)
	var props := Node2D.new()
	props.name = "Props"
	props.z_index = 2
	add_child(props)
	for p in data["props"]:
		_add_contact_shadow(props, p)
		var s := Sprite2D.new()
		s.centered = false
		s.texture = load(RoomData.PROP_DIR + p["tex"] + ".png")
		s.position = p["pos"]
		props.add_child(s)


func _add_side_door(parent: Node2D, center_x: float, is_open: bool, flip: bool) -> void:
	var s := Sprite2D.new()
	s.centered = false
	s.texture = load(RoomData.SIDE_DOOR_OPEN_TEX if is_open else RoomData.SIDE_DOOR_CLOSED_TEX)
	var w := s.texture.get_width()
	s.position = Vector2(center_x - w * 0.5, 14)
	s.flip_h = flip
	parent.add_child(s)


## 프랍 아래 짧고 단단한 사각 픽셀 접촉 그림자 (GameReady 노트 권장)
func _add_contact_shadow(parent: Node2D, p: Dictionary) -> void:
	var tex: Texture2D = load(RoomData.PROP_DIR + p["tex"] + ".png")
	var pos: Vector2 = p["pos"]
	var w := tex.get_width()
	var shadow := ColorRect.new()
	shadow.color = Color(0, 0, 0, 0.35)
	shadow.position = Vector2(pos.x + 18, RoomData.FLOOR_Y - 2)
	shadow.size = Vector2(w - 36, 10)
	parent.add_child(shadow)


## 플레이어가 상호작용 가능한 정면문 반환(없으면 빈 Dictionary)
func front_door_near(px: float) -> Dictionary:
	for fd in front_doors:
		if absf(fd["center"].x - px) <= FRONT_DOOR_INTERACT_RANGE:
			return fd
	return {}


func front_door_spawn_x(index: int) -> float:
	if index >= 0 and index < front_doors.size():
		return front_doors[index]["center"].x
	return width * 0.5
