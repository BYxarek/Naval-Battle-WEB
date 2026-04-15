import { LobbyControls } from './lobby/LobbyControls';
import { LobbyRules } from './lobby/LobbyRules';

export function LobbyScreen({ onlineCount }: { onlineCount?: number }) {
  return (
    <section className="hero-grid">
      <LobbyRules className="lobby-rules-desktop" />
      <LobbyControls onlineCount={onlineCount} />
    </section>
  );
}
