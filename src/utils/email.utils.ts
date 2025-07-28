import { createCanvas,GlobalFonts } from '@napi-rs/canvas';
import * as path from 'path';

// Register the font
const fontPath = path.resolve(__dirname, '..', 'assets', 'fonts', 'AvenirNext-Regular.ttf');
GlobalFonts.registerFromPath(fontPath, 'AvenirNext');

export async function generateTopHoldingsChartImage(
  data: { scripName: string; value: number }[]
): Promise<Buffer> {
  if (!data || data.length === 0) throw new Error('Data array is empty');
  
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  if (total <= 0) throw new Error('Total value must be positive');

  const width = 800;
  const height = 520;
  const padding = 30;
  const radius = 160;
  const centerX = 300;
  const centerY = height / 2;

  const colors = [
    '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#03a9f4',
    '#e91e63', '#00bcd4', '#8bc34a', '#ffc107', '#673ab7',
  ];

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  let startAngle = 0;
  data.forEach((item, i) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    
    // Draw pie segment
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    
    // Add border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add percentage label
    const labelAngle = startAngle + sliceAngle / 2;
    const labelX = centerX + (radius + 30) * Math.cos(labelAngle);
    const labelY = centerY + (radius + 30) * Math.sin(labelAngle);
    const percent = ((item.value / total) * 100).toFixed(1);
    
    ctx.font = '11px AvenirNext';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percent}%`, labelX, labelY);

    // Add legend
    const legendX = width - 220;
    const legendY = padding + i * 25;
    
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(legendX, legendY, 15, 15);
    
    ctx.font = '13px AvenirNext';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(item.scripName, legendX + 20, legendY);

    startAngle += sliceAngle;
  });

  return canvas.toBuffer('image/png');
}