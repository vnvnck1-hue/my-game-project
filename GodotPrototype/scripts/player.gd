class_name Player
extends Node2D
## 붉은 후드 정비공. 위치는 바닥 월드 좌표(발 밑), 스프라이트는 Bottom Center 피벗.
## 상태 우선순위: Shoot > Crouch > Walk > Idle  (RESOURCE_USAGE_GUIDE.md 5장)

signal shoot_fired(muzzle_pos: Vector2, dir: int)
signal request_front_door()

const FRAME_SIZE := 320
const FRAMES_DIR := "res://assets/character/Frames/"
const CLIPS := {
	"idle":   {"fps": 4.0,  "loop": true},
	"walk":   {"fps": 8.0,  "loop": true},
	"shoot":  {"fps": 10.0, "loop": false},
	"crouch": {"fps": 6.0,  "loop": false},
}
const MUZZLE_FRAME := 2          # 0-based → 3번째 프레임에 총구 화염
const SPEED := 420.0
const WALK_THRESHOLD := 10.0

enum State { IDLE, WALK, SHOOT, CROUCH, UNCROUCH }

var state: State = State.IDLE
var facing := 1                  # 1 = 오른쪽(기본), -1 = 왼쪽
var velocity_x := 0.0
var input_enabled := true
var min_x := 0.0
var max_x := 10000.0
var _muzzle_done := false

var sprite: AnimatedSprite2D


func _ready() -> void:
	sprite = AnimatedSprite2D.new()
	sprite.name = "Sprite"
	sprite.centered = false
	sprite.offset = Vector2(-FRAME_SIZE * 0.5, -FRAME_SIZE)   # Bottom Center 피벗
	sprite.sprite_frames = _build_frames()
	add_child(sprite)
	sprite.animation_finished.connect(_on_animation_finished)
	sprite.frame_changed.connect(_on_frame_changed)
	sprite.play("idle")


func _build_frames() -> SpriteFrames:
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	for clip_name in CLIPS.keys():
		var cfg: Dictionary = CLIPS[clip_name]
		sf.add_animation(clip_name)
		sf.set_animation_speed(clip_name, cfg["fps"])
		sf.set_animation_loop(clip_name, cfg["loop"])
		for i in range(1, 5):
			var path := "%s%s/%s_%02d.png" % [FRAMES_DIR, clip_name, clip_name, i]
			sf.add_frame(clip_name, load(path))
	return sf


func _process(delta: float) -> void:
	var axis := 0.0
	var crouch_held := false
	if input_enabled:
		axis = Input.get_axis("move_left", "move_right")
		crouch_held = Input.is_action_pressed("crouch")
		if Input.is_action_just_pressed("shoot") and state != State.CROUCH and state != State.UNCROUCH:
			_start_shoot()
		if Input.is_action_just_pressed("interact") and state != State.SHOOT:
			request_front_door.emit()

	# 숙이기 진입/해제
	if state != State.SHOOT:
		if crouch_held and state != State.CROUCH:
			state = State.CROUCH
			sprite.play("crouch")
		elif not crouch_held and state == State.CROUCH:
			state = State.UNCROUCH
			sprite.play_backwards("crouch")

	# 이동 (숙인 동안은 정지)
	var moving := false
	if state != State.CROUCH and state != State.UNCROUCH:
		velocity_x = axis * SPEED
		if absf(velocity_x) > WALK_THRESHOLD:
			moving = true
			facing = 1 if velocity_x > 0 else -1
			position.x = clampf(position.x + velocity_x * delta, min_x, max_x)
	else:
		velocity_x = 0.0

	sprite.flip_h = facing < 0

	# Idle / Walk 상태 결정 (Shoot·Crouch 가 우선)
	if state == State.IDLE or state == State.WALK:
		var want: State = State.WALK if moving else State.IDLE
		if want != state:
			state = want
			sprite.play("walk" if moving else "idle")


func _start_shoot() -> void:
	state = State.SHOOT
	_muzzle_done = false
	sprite.play("shoot")
	sprite.frame = 0


func _on_frame_changed() -> void:
	if state == State.SHOOT and sprite.animation == "shoot" and sprite.frame == MUZZLE_FRAME and not _muzzle_done:
		_muzzle_done = true
		var muzzle := position + Vector2(118 * facing, -158)
		shoot_fired.emit(muzzle, facing)


func _on_animation_finished() -> void:
	match state:
		State.SHOOT, State.UNCROUCH:
			# 재생이 끝나면 현재 이동 상태에 따라 Idle/Walk 로 복귀
			state = State.IDLE
			sprite.play("idle")
		State.CROUCH:
			pass   # 마지막 프레임 유지


func set_bounds(left: float, right: float) -> void:
	min_x = left
	max_x = right
	position.x = clampf(position.x, min_x, max_x)


func face(dir: int) -> void:
	facing = dir
	sprite.flip_h = facing < 0
