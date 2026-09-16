class_name Bullet
extends Node2D
## 단순 투사체. 시각 프레임(총구 화염)과 별개의 로직으로 생성된다.

const SPEED := 1500.0
const SIZE := Vector2(28, 8)

var dir := 1
var room_width := 0.0


func _ready() -> void:
	var body := ColorRect.new()
	body.color = Color(1.0, 0.85, 0.35)
	body.position = -SIZE * 0.5
	body.size = SIZE
	add_child(body)
	var core := ColorRect.new()
	core.color = Color(1.0, 1.0, 0.9)
	core.position = Vector2(-SIZE.x * 0.5 + 6, -2)
	core.size = Vector2(SIZE.x - 12, 4)
	add_child(core)


func _process(delta: float) -> void:
	position.x += SPEED * dir * delta
	if position.x < -400 or position.x > room_width + 400:
		queue_free()
