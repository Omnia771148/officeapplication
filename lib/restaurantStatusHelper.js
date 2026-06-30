import dbConnect from "./mongoose";
import RestuarentUser from "../models/RestuarentUser";

function getKolkataTime(now) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const getVal = (type) => parts.find(p => p.type === type).value;
  
  const year = parseInt(getVal('year'), 10);
  const month = parseInt(getVal('month'), 10);
  const day = parseInt(getVal('day'), 10);
  let hour = parseInt(getVal('hour'), 10);
  const minute = parseInt(getVal('minute'), 10);
  
  if (hour === 24) hour = 0;
  
  return { year, month, day, hour, minute };
}

function isSameDayInKolkata(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  const getDayStr = (d) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  };
  
  return getDayStr(d1) === getDayStr(d2);
}

function isRestaurantOpen(openTime, closeTime, currentHour, currentMinute) {
  if (!openTime || !closeTime) return false;

  const currentMinutes = currentHour * 60 + currentMinute;

  const [openHour, openMin] = openTime.split(':').map(Number);
  const openMinutes = openHour * 60 + openMin;

  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  const closeMinutes = closeHour * 60 + closeMin;

  if (closeMinutes > openMinutes) {
    // Normal day: e.g. 09:00 to 22:00
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Overnight: e.g. 18:00 to 02:00
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
}

function shouldManualOverrideExpire(openTime, closeTime, manualStatusUpdatedAt, now) {
  if (!openTime || !closeTime) return true;

  const manualDate = new Date(manualStatusUpdatedAt);
  const nowDate = new Date(now);

  const diffMs = nowDate.getTime() - manualDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours >= 24) return true; // Max 24 hours override

  const kolkataManual = getKolkataTime(manualDate);
  const kolkataNow = getKolkataTime(nowDate);

  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  const manualMinutes = kolkataManual.hour * 60 + kolkataManual.minute;
  const currentMinutes = kolkataNow.hour * 60 + kolkataNow.minute;

  const getRelativeMinutes = (min) => (min - openMinutes + 1440) % 1440;
  
  const relManual = getRelativeMinutes(manualMinutes);
  const relCurrent = getRelativeMinutes(currentMinutes);
  const relClose = getRelativeMinutes(closeMinutes);

  // If the manual override was set before the closing time, and the current time is past/equal the close time, it expires.
  if (relManual < relClose && relCurrent >= relClose) {
    return true;
  }

  // Fallback: also expire if calendar day changed for normal hours
  if (closeMinutes > openMinutes && !isSameDayInKolkata(manualDate, nowDate)) {
    return true;
  }

  return false;
}

export async function updateAllRestaurantStatuses() {
  try {
    await dbConnect();

    const restaurants = await RestuarentUser.find({});
    const now = new Date();
    const kolkataTime = getKolkataTime(now);

    for (const rest of restaurants) {
      let isActive = rest.isActive !== undefined ? rest.isActive : true;
      let isManuallyToggled = rest.isManuallyToggled || false;

      const hasSchedule = rest.openTime && rest.closeTime;

      if (hasSchedule) {
        // Scheduled Mode
        let isExpired = false;
        if (isManuallyToggled && rest.manualStatusUpdatedAt) {
          if (shouldManualOverrideExpire(rest.openTime, rest.closeTime, rest.manualStatusUpdatedAt, now)) {
            isExpired = true;
          }
        }

        if (isExpired) {
          isActive = isRestaurantOpen(rest.openTime, rest.closeTime, kolkataTime.hour, kolkataTime.minute);
          
          await RestuarentUser.findOneAndUpdate(
            { restId: rest.restId },
            { 
              isActive, 
              isManuallyToggled: false 
            }
          );
        } else if (!isManuallyToggled) {
          const computedActive = isRestaurantOpen(rest.openTime, rest.closeTime, kolkataTime.hour, kolkataTime.minute);
          if (computedActive !== isActive) {
            await RestuarentUser.findOneAndUpdate(
              { restId: rest.restId },
              { 
                isActive: computedActive, 
                isManuallyToggled: false 
              }
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to auto-update restaurant statuses:", error);
  }
}
