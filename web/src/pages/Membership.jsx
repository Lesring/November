import { catalog } from '../lib/catalog'
import { useStore } from '../store'

export default function Membership() {
  const { membership } = catalog
  const { notify } = useStore()

  return (
    <div className="membership">
      <p className="kicker">会员</p>
      <h1>{membership.headline}</h1>
      <p className="lede">{membership.intro}</p>
      <div className="tiers">
        {membership.tiers.map((tier) => (
          <article key={tier.id} className={tier.recommended ? 'tier recommended' : 'tier'}>
            {tier.recommended ? <span className="recommend">推荐</span> : null}
            <h2>{tier.name}</h2>
            <p className="tier-price">{tier.priceLabel}</p>
            <p className="muted">{tier.blurb}</p>
            <ul>
              {tier.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <button type="button" className="btn primary wide" onClick={() => notify(membership.note)}>
        了解会员
      </button>
      <p className="muted small center">{membership.note}</p>
    </div>
  )
}
