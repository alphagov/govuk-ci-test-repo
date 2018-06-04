class OrganisationsController < ApplicationController
  def index
    @organisations = ContentStoreOrganisations.find!("/government/organisations")
    setup_content_item_and_navigation_helpers(@organisations)
  end

  def show
    @organisation = Organisation.find!("/government/organisations/#{params[:organisation_name]}")
    setup_content_item_and_navigation_helpers(@organisation)

    respond_to do |f|
      f.html do
        render :show, locals: {
            organisation: @organisation
        }
      end
      f.json do
        render json: {
            breadcrumbs: breadcrumb_content,
            html: show_organisation_partial(@organisation)
        }
      end
    end
  end

private

  def show_organisation_partial(organisation)
    render_partial('organisation/_show_organisation',
                   organisation: organisation)
  end
end