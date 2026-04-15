import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type { SanitizedRoomState } from '../../../shared/game';
import { useI18n } from '../../i18n';
import { FleetPanel } from './sidebar/FleetPanel';
import { RoomInfoPanel } from './sidebar/RoomInfoPanel';

type ShipGroupView = {
  key: string;
  label: string;
  total: number;
  remaining: number;
  nextShipId?: string;
  isActive: boolean;
};

type GameSidebarProps = {
  room: SanitizedRoomState;
  currentPlayer: SanitizedRoomState['players'][number];
  shipGroups: ShipGroupView[];
  mobileSidebarOpen: boolean;
  placementInstruction: string;
  isSetupBusy: boolean;
  busyAction: 'clear' | 'auto' | null;
  onCloseMenu: () => void;
  onInviteFriend: () => void;
  onSelectShip: (shipId: string) => void;
  onAutoPlaceShips: () => void;
  onClearDraft: () => void;
  onSubmitPlacements: () => void;
  onCancelGame: () => void;
  onSurrender: () => void;
};

export function GameSidebar(props: GameSidebarProps) {
  const { t } = useI18n();
  const {
    room,
    currentPlayer,
    shipGroups,
    mobileSidebarOpen,
    placementInstruction,
    isSetupBusy,
    busyAction,
    onCloseMenu,
    onInviteFriend,
    onSelectShip,
    onAutoPlaceShips,
    onClearDraft,
    onSubmitPlacements,
    onCancelGame,
    onSurrender,
  } = props;

  return (
    <aside className={`sidebar ${mobileSidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="mobile-sidebar-header">
        <p className="eyebrow">{t('game.matchMenu')}</p>
        <button className="ghost-button mobile-sidebar-close" onClick={onCloseMenu} aria-label={t('game.closeMatchMenu')}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      <RoomInfoPanel room={room} onInviteFriend={onInviteFriend} />
      <FleetPanel
        room={room}
        currentPlayer={currentPlayer}
        opponents={room.players.filter((player) => !player.isYou)}
        shipGroups={shipGroups}
        placementInstruction={placementInstruction}
        isSetupBusy={isSetupBusy}
        busyAction={busyAction}
        onSelectShip={onSelectShip}
        onAutoPlaceShips={onAutoPlaceShips}
        onClearDraft={onClearDraft}
        onSubmitPlacements={onSubmitPlacements}
        onCancelGame={onCancelGame}
        onSurrender={onSurrender}
      />
    </aside>
  );
}
