import englishGuide from './guide.json';
import polish from './guide.pl.json';
import en from './ui.en.json';
import pl from './ui.pl.json';

export type Locale = 'en' | 'pl';
export const ui = { en, pl } satisfies Record<Locale, typeof en>;

export function getGuide(locale: Locale) {
  return {
    groups: englishGuide.groups.map(group => ({
      ...group,
      name: locale === 'pl' ? polish.groups[group.name as keyof typeof polish.groups] : group.name,
      skills: group.skills.map(skill => ({
        ...skill,
        ...(locale === 'pl' ? polish.skills[skill.name as keyof typeof polish.skills] : {}),
      })),
    })),
    phases: englishGuide.phases.map(phase => ({
      ...phase,
      key: phase.name,
      ...(locale === 'pl' ? polish.phases[phase.name as keyof typeof polish.phases] : {}),
    })),
  };
}
