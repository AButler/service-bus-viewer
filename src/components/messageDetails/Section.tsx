import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CopyButton from "./CopyButton";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ letterSpacing: 0.6 }}
    >
      {children}
    </Typography>
  );
}

interface SectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  /** When set, a hover-revealed copy button for this value is shown. */
  copyValue?: string;
  children: React.ReactNode;
}

/** A collapsible, bordered accordion section with an optional copy button. */
export default function Section({
  title,
  expanded,
  onToggle,
  copyValue,
  children,
}: SectionProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      square
      elevation={0}
      sx={{
        bgcolor: "transparent",
        borderBottom: 1,
        borderColor: "divider",
        "&:first-of-type": {
          mt: 1.5,
        },
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        component="div"
        expandIcon={<ExpandMoreRoundedIcon fontSize="small" />}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          px: 0,
          minHeight: 0,
          "& .MuiAccordionSummary-content": { my: 1, alignItems: "center" },
        }}
      >
        <SectionTitle>{title}</SectionTitle>
        {copyValue !== undefined && (
          <Box sx={{ ml: "auto", mr: 1, display: "inline-flex" }}>
            <CopyButton
              value={copyValue}
              label={`Copy ${title}`}
              hovered={hovered}
            />
          </Box>
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
