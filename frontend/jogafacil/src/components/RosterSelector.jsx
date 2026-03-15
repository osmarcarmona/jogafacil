import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Checkbox, Paper
} from '@mui/material'
import { togglePlayer, selectAll, deselectAll } from '../utils/rosterUtils'

/**
 * RosterSelector — checklist of players with select/deselect all controls.
 *
 * Props:
 *  - players: Array<{ id: string, name: string }> — filtered player list
 *  - selectedIds: string[] — currently selected player IDs
 *  - onChange: (newSelectedIds: string[]) => void
 */
export default function RosterSelector({ players, selectedIds, onChange }) {
  const handleToggle = (playerId) => {
    onChange(togglePlayer(selectedIds, playerId))
  }

  return (
    <Paper variant="outlined" sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1 }}>
        <Typography variant="subtitle2">
          Seleccionados: {selectedIds.length} / {players.length}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={() => onChange(selectAll(players))}>
            Seleccionar Todos
          </Button>
          <Button size="small" onClick={() => onChange(deselectAll())}>
            Deseleccionar Todos
          </Button>
        </Box>
      </Box>
      <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
        {players.map((player) => (
          <ListItem key={player.id} disablePadding>
            <ListItemButton onClick={() => handleToggle(player.id)} dense>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  edge="start"
                  checked={selectedIds.includes(player.id)}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ 'aria-label': player.name }}
                />
              </ListItemIcon>
              <ListItemText primary={player.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}
