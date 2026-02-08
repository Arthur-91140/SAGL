export function getGreeting(type: string): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) {
    switch (type) {
      case 'START':
        return 'Bonne matinée et bon début de mission !';
      case 'END':
        return "Bonne matinée ! On espère que tout s'est bien passé.";
      default:
        return 'Bonne matinée !';
    }
  }

  if (hour >= 10 && hour < 14) {
    switch (type) {
      case 'START':
        return 'Bonne journée et bon courage pour cette mission !';
      case 'END':
        return "Bonne fin de matinée ! On espère que la mission s'est bien déroulée.";
      default:
        return 'Bonne journée !';
    }
  }

  if (hour >= 14 && hour < 18) {
    switch (type) {
      case 'START':
        return "Bon après-midi et bon début de mission !";
      case 'END':
        return "Bon après-midi ! On espère que tout s'est bien passé.";
      default:
        return "Bon après-midi !";
    }
  }

  if (hour >= 18 && hour < 21) {
    switch (type) {
      case 'START':
        return 'Bonne soirée et bon courage pour cette mission !';
      case 'END':
        return "Bonne soirée ! On espère que la mission s'est bien déroulée.";
      default:
        return 'Bonne soirée !';
    }
  }

  // 21h - 5h
  switch (type) {
    case 'START':
      return 'Bonne nuit et bon courage pour cette mission !';
    case 'END':
      return "Bonne nuit ! On espère que tout s'est bien passé.";
    default:
      return 'Bonne nuit !';
  }
}
