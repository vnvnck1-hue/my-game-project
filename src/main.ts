import { Game } from "./core/Game";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#game-canvas missing");

const game = new Game(canvas, "ui-root");
game.start();

// 노출 (디버그용)
(window as unknown as { __game: Game }).__game = game;
