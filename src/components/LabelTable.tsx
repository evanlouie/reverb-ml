import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@material-ui/core";
import { Delete, PlayArrow } from "@material-ui/icons";
import React, { StatelessComponent } from "react";
import { Label } from "../entities/Label";
import { stringToRGBA } from "../lib/colour";

interface ILabelTableProps {
  labels: Label[];
  playLabel: (label: Label) => void;
  deleteLabel: (label: Label) => void;
}
export const LabelTable: StatelessComponent<ILabelTableProps> = ({
  labels,
  playLabel,
  deleteLabel,
}) => (
  <div className="LabelTable">
    <Paper>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Classifier</TableCell>
            <TableCell>Start (Seconds)</TableCell>
            <TableCell>End (Seconds)</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {labels.sort((a, b) => a.startTime - b.startTime).map((l) => (
            <LabelTableRow key={l.id} label={l} playLabel={playLabel} deleteLabel={deleteLabel} />
          ))}
        </TableBody>
      </Table>
    </Paper>
  </div>
);

const LabelTableRow: StatelessComponent<{
  label: Label;
  playLabel: (l: Label) => void;
  deleteLabel: (label: Label) => void;
}> = ({ label, playLabel, deleteLabel }) => {
  const {
    id,
    startTime,
    endTime,
    classification: { name },
  } = label;
  return (
    <TableRow key={id}>
      <TableCell>
        <span style={{ color: stringToRGBA(name, { alpha: 1 }) }}>{name}</span>
      </TableCell>
      <TableCell>{startTime}</TableCell>
      <TableCell>{endTime}</TableCell>
      <TableCell>
        <Tooltip title="Play Label">
          <Button mini={true} color="primary" onClick={() => playLabel(label)}>
            <PlayArrow />
          </Button>
        </Tooltip>
        <Tooltip title="Delete Label">
          <Button mini={true} color="secondary" onClick={() => deleteLabel(label)}>
            <Delete />
          </Button>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

// export class LabelTable extends React.PureComponent<ILabelTableProps> {
//   public render() {
//     const { labels } = this.props;
//     return (
//       <div className="LabelTable">
//         <Paper>
//           <Table>
//             <TableHead>
//               <TableRow>
//                 <TableCell>Classifier</TableCell>
//                 <TableCell>Start (Seconds)</TableCell>
//                 <TableCell>End (Seconds)</TableCell>
//                 <TableCell />
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {labels.sort((a, b) => a.startTime - b.startTime).map(this.tableRow)}
//             </TableBody>
//           </Table>
//         </Paper>
//       </div>
//     );
//   }

//   private tableRow = (label: Label) => {
//     const {
//       id,
//       startTime,
//       endTime,
//       classification: { name },
//     } = label;
//     const { playLabel, deleteLabel } = this.props;
//     return (
//       <TableRow key={id}>
//         <TableCell>
//           <span style={{ color: stringToRGBA(name, { alpha: 1 }) }}>{name}</span>
//         </TableCell>
//         <TableCell>{startTime}</TableCell>
//         <TableCell>{endTime}</TableCell>
//         <TableCell>
//           <Tooltip title="Play Label">
//             <Button mini={true} color="primary" onClick={() => playLabel(label)}>
//               <PlayArrow />
//             </Button>
//           </Tooltip>
//           <Tooltip title="Delete Label">
//             <Button mini={true} color="secondary" onClick={() => deleteLabel(label)}>
//               <Delete />
//             </Button>
//           </Tooltip>
//         </TableCell>
//       </TableRow>
//     );
//   };
// }
