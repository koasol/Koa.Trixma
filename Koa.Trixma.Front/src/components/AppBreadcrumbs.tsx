import React from "react";
import {Breadcrumbs, Link, Typography} from "@mui/material";
import {Home as HomeIcon} from "@mui/icons-material";
import {Link as RouterLink} from "react-router-dom";

export interface BreadcrumbItem {
  label: React.ReactNode;
  to?: string;
}

interface AppBreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  sx?: object;
}

const AppBreadcrumbs: React.FC<AppBreadcrumbsProps> = ({
  items,
  showHome = true,
  sx,
}) => (
  <Breadcrumbs
    separator="/"
    aria-label="breadcrumb"
    sx={{
      mb: 3,
      ml: {xs: 1, md: 0},
      alignItems: "center",
      "& .MuiBreadcrumbs-li": {display: "inline-flex", alignItems: "center"},
      ...sx,
    }}
  >
    {showHome && (
      <Link
        component={RouterLink}
        to="/"
        underline="hover"
        color="inherit"
        sx={{display: "inline-flex", alignItems: "center"}}
      >
        <HomeIcon fontSize="small" sx={{verticalAlign: "middle", mt: "1px"}} />
      </Link>
    )}

    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      if (item.to && !isLast) {
        return (
          <Link
            key={`breadcrumb-link-${index}`}
            component={RouterLink}
            to={item.to}
            underline="hover"
            color="inherit"
          >
            {item.label}
          </Link>
        );
      }

      return (
        <Typography key={`breadcrumb-current-${index}`} color="text.primary">
          {item.label}
        </Typography>
      );
    })}
  </Breadcrumbs>
);

export default AppBreadcrumbs;
